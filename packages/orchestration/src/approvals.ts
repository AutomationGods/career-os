import { prisma as defaultPrisma } from "@career-os/db";
import { prismaEventStore, type CareerEventInput, type EventStore } from "@career-os/events";
import type { ApprovalRequestInput, ApprovalRequestRecord, ApprovalStatus, CareerCommand, PermissionDecision, RiskLevel } from "@career-os/shared";

export interface ApprovalDecisionInput {
  decidedBy?: string;
  decisionPayload?: unknown;
  reason?: string;
}

export interface ApprovalRequestService {
  createForCommand(command: CareerCommand, decision: PermissionDecision): Promise<ApprovalRequestRecord> | ApprovalRequestRecord;
  list(): Promise<ApprovalRequestRecord[]> | ApprovalRequestRecord[];
  getById(id: string): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  approve(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  reject(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  cancel(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  expire(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
}

type PrismaLike = {
  approvalRequest: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    update(args: unknown): Promise<unknown>;
  };
};

function createApprovalId() {
  return `approval_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function fallbackUserId(userId?: string) {
  return userId ?? "local-user";
}

function normalizeApproval(input: ApprovalRequestInput, id = input.id ?? createApprovalId()): ApprovalRequestRecord {
  const now = new Date();
  return {
    ...input,
    id,
    userId: fallbackUserId(input.userId),
    status: input.status ?? "pending",
    requestedAt: input.requestedAt ?? now,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now
  };
}

function toApprovalRecord(row: unknown): ApprovalRequestRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as ApprovalRequestRecord;
  return {
    ...record,
    status: (record.status ?? "pending") as ApprovalStatus,
    riskLevel: (record.riskLevel ?? "medium") as RiskLevel,
    userId: fallbackUserId(record.userId),
    requestedAt: new Date(record.requestedAt ?? record.createdAt),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt ?? record.createdAt),
    decidedAt: record.decidedAt ? new Date(record.decidedAt) : undefined,
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined
  };
}

function toApprovalRecords(rows: unknown[]) {
  return rows.map(toApprovalRecord).filter((row): row is ApprovalRequestRecord => Boolean(row));
}

function approvalEvent(record: ApprovalRequestRecord, eventType: string): CareerEventInput {
  return {
    eventType,
    entityType: eventType.startsWith("command.") ? "command" : record.entityType ?? "approval_request",
    entityId: eventType.startsWith("command.") ? record.commandId : record.entityId ?? record.id,
    domain: "orchestration",
    manager: "ApprovalRequestService",
    capability: "HumanApprovalGateCapability",
    worker: "ApprovalRequestWorker",
    userId: record.userId,
    payload: {
      approvalRequestId: record.id,
      commandId: record.commandId,
      commandType: record.commandType,
      permission: record.permission,
      entityType: record.entityType,
      entityId: record.entityId,
      riskLevel: record.riskLevel,
      reason: record.reason,
      userId: record.userId
    },
    confidence: 1
  };
}

export class InMemoryApprovalRequestService implements ApprovalRequestService {
  private requests = new Map<string, ApprovalRequestRecord>();

  constructor(private readonly eventStore?: EventStore) {}

  createForCommand(command: CareerCommand, decision: PermissionDecision) {
    const existing = [...this.requests.values()].find((request) => request.commandId === command.id && request.status === "pending");
    if (existing) return existing;

    const request = normalizeApproval({
      userId: command.userId,
      commandId: command.id,
      commandType: command.type,
      permission: decision.permission,
      entityType: command.entityType,
      entityId: command.entityId,
      riskLevel: decision.riskLevel,
      reason: decision.reason,
      requestPayload: command.payload,
      requestedBy: command.requestedBy
    });
    this.requests.set(request.id, request);
    this.eventStore?.append(approvalEvent(request, "approval.requested"));
    return request;
  }

  list() {
    return [...this.requests.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getById(id: string) {
    return this.requests.get(id);
  }

  approve(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "approved", input, "approval.approved");
  }

  reject(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "rejected", input, "approval.rejected");
  }

  cancel(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "cancelled", input, "approval.cancelled");
  }

  expire(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "expired", input, "approval.expired");
  }

  private decide(id: string, status: ApprovalStatus, input: ApprovalDecisionInput, eventType: string) {
    const existing = this.requests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, status, decisionPayload: input.decisionPayload ?? { decidedBy: input.decidedBy, reason: input.reason }, decidedAt: new Date(), updatedAt: new Date() };
    this.requests.set(id, updated);
    this.eventStore?.append(approvalEvent(updated, eventType));
    if (status === "approved") this.eventStore?.append(approvalEvent(updated, "command.approval_granted"));
    if (status === "rejected") this.eventStore?.append(approvalEvent(updated, "command.approval_denied"));
    return updated;
  }
}

export class PrismaApprovalRequestService implements ApprovalRequestService {
  constructor(private readonly eventStore?: EventStore, private readonly client: PrismaLike = defaultPrisma as unknown as PrismaLike) {}

  async createForCommand(command: CareerCommand, decision: PermissionDecision) {
    const existing = toApprovalRecord(
      await this.client.approvalRequest.findFirst({ where: { commandId: command.id, status: "pending" } })
    );
    if (existing) return existing;

    const normalized = normalizeApproval({
      userId: command.userId,
      commandId: command.id,
      commandType: command.type,
      permission: decision.permission,
      entityType: command.entityType,
      entityId: command.entityId,
      riskLevel: decision.riskLevel,
      reason: decision.reason,
      requestPayload: command.payload,
      requestedBy: command.requestedBy
    });
    const row = await this.client.approvalRequest.create({ data: normalized });
    const record = toApprovalRecord(row);
    if (!record) throw new Error("Failed to create approval request");
    await this.eventStore?.append(approvalEvent(record, "approval.requested"));
    return record;
  }

  async list() {
    return toApprovalRecords(await this.client.approvalRequest.findMany({ orderBy: { createdAt: "desc" } }));
  }

  async getById(id: string) {
    return toApprovalRecord(await this.client.approvalRequest.findUnique({ where: { id } }));
  }

  approve(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "approved", input, "approval.approved");
  }

  reject(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "rejected", input, "approval.rejected");
  }

  cancel(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "cancelled", input, "approval.cancelled");
  }

  expire(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "expired", input, "approval.expired");
  }

  private async decide(id: string, status: ApprovalStatus, input: ApprovalDecisionInput, eventType: string) {
    try {
      const row = await this.client.approvalRequest.update({
        where: { id },
        data: {
          status,
          decisionPayload: input.decisionPayload ?? { decidedBy: input.decidedBy, reason: input.reason },
          decidedAt: new Date(),
          updatedAt: new Date()
        }
      });
      const record = toApprovalRecord(row);
      if (!record) return undefined;
      await this.eventStore?.append(approvalEvent(record, eventType));
      if (status === "approved") await this.eventStore?.append(approvalEvent(record, "command.approval_granted"));
      if (status === "rejected") await this.eventStore?.append(approvalEvent(record, "command.approval_denied"));
      return record;
    } catch {
      return undefined;
    }
  }
}

export const approvalRequestService = new InMemoryApprovalRequestService();
export const prismaApprovalRequestService = new PrismaApprovalRequestService(prismaEventStore);

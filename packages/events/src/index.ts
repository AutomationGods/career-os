import { prisma as defaultPrisma } from "@career-os/db";

export interface CareerEventInput {
  eventType: string;
  entityType: string;
  entityId: string;
  domain: string;
  manager?: string;
  capability?: string;
  worker?: string;
  userId?: string;
  payload?: unknown;
  evidence?: unknown;
  confidence?: number;
  modelUsed?: string;
  promptVersion?: string;
  createdAt?: Date;
}

export interface CareerEventRecord extends CareerEventInput {
  id: string;
  payload: unknown;
  createdAt: Date;
}

export interface EventStore {
  append(event: CareerEventInput): CareerEventRecord | Promise<CareerEventRecord>;
  appendMany(events: CareerEventInput[]): CareerEventRecord[] | Promise<CareerEventRecord[]>;
  getById(id: string): CareerEventRecord | undefined | Promise<CareerEventRecord | undefined>;
  listByEntity(entityType: string, entityId: string): CareerEventRecord[] | Promise<CareerEventRecord[]>;
  listByType(eventType: string): CareerEventRecord[] | Promise<CareerEventRecord[]>;
  listByDomain(domain: string): CareerEventRecord[] | Promise<CareerEventRecord[]>;
  listRecent(limit: number): CareerEventRecord[] | Promise<CareerEventRecord[]>;
  listByUser(userId: string): CareerEventRecord[] | Promise<CareerEventRecord[]>;
}

type PrismaLike = {
  event: {
    create(args: unknown): Promise<unknown>;
    createMany(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
};

function createEventId() {
  return `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEvent(event: CareerEventInput, id = createEventId()): CareerEventRecord {
  return {
    ...event,
    id,
    payload: event.payload ?? {},
    createdAt: event.createdAt ?? new Date()
  };
}

function toRecord(row: unknown): CareerEventRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as CareerEventRecord;
  return {
    ...record,
    payload: record.payload ?? {},
    createdAt: new Date(record.createdAt)
  };
}

function toRecords(rows: unknown[]): CareerEventRecord[] {
  return rows.map(toRecord).filter((row): row is CareerEventRecord => Boolean(row));
}

export class InMemoryEventStore implements EventStore {
  private events: CareerEventRecord[] = [];

  append(event: CareerEventInput) {
    const saved = normalizeEvent(event);
    this.events.push(saved);
    return saved;
  }

  appendMany(events: CareerEventInput[]) {
    return events.map((event) => this.append(event));
  }

  getById(id: string) {
    return this.events.find((event) => event.id === id);
  }

  listByEntity(entityType: string, entityId: string) {
    return this.events.filter((event) => event.entityType === entityType && event.entityId === entityId);
  }

  listByType(eventType: string) {
    return this.events.filter((event) => event.eventType === eventType);
  }

  listByDomain(domain: string) {
    return this.events.filter((event) => event.domain === domain);
  }

  listRecent(limit: number) {
    return [...this.events].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  listByUser(userId: string) {
    return this.events.filter((event) => event.userId === userId);
  }

  list() {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}

export class PrismaEventStore implements EventStore {
  constructor(private readonly client: PrismaLike = defaultPrisma as unknown as PrismaLike) {}

  async append(event: CareerEventInput) {
    const normalized = normalizeEvent(event);
    const row = await this.client.event.create({
      data: {
        eventType: normalized.eventType,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        domain: normalized.domain,
        manager: normalized.manager,
        capability: normalized.capability,
        worker: normalized.worker,
        userId: normalized.userId,
        payload: normalized.payload,
        evidence: normalized.evidence,
        confidence: normalized.confidence,
        modelUsed: normalized.modelUsed,
        promptVersion: normalized.promptVersion,
        createdAt: normalized.createdAt
      }
    });
    const record = toRecord(row);
    if (!record) throw new Error("Failed to append event");
    return record;
  }

  async appendMany(events: CareerEventInput[]) {
    return Promise.all(events.map((event) => this.append(event)));
  }

  async getById(id: string) {
    return toRecord(await this.client.event.findUnique({ where: { id } }));
  }

  async listByEntity(entityType: string, entityId: string) {
    return toRecords(await this.client.event.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "asc" } }));
  }

  async listByType(eventType: string) {
    return toRecords(await this.client.event.findMany({ where: { eventType }, orderBy: { createdAt: "desc" } }));
  }

  async listByDomain(domain: string) {
    return toRecords(await this.client.event.findMany({ where: { domain }, orderBy: { createdAt: "desc" } }));
  }

  async listRecent(limit: number) {
    return toRecords(await this.client.event.findMany({ take: limit, orderBy: { createdAt: "desc" } }));
  }

  async listByUser(userId: string) {
    return toRecords(await this.client.event.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }));
  }
}

export const eventStore = new InMemoryEventStore();
export const prismaEventStore = new PrismaEventStore();

import { prisma as defaultPrisma } from "@career-os/db";
import type { JobSegment, NormalizedJob } from "@career-os/shared";

export type ApplicationPacketStatus = "not_started" | "ready_to_generate" | "generated" | "awaiting_review" | "ready_to_apply" | "submitted" | "followup_due" | "closed";

export interface ApplicationPacketParty {
  id?: string;
  name: string;
  email?: string;
}

export interface ApplicationPacketFitScoreSummary {
  score: number;
  segment: JobSegment;
  highlights: string[];
}

export interface ApplicationPacketRecord {
  id: string;
  userId?: string;
  applicationId?: string;
  jobId: string;
  companyId?: string;
  personId?: string;
  selectedJob: NormalizedJob;
  selectedCompany?: ApplicationPacketParty;
  selectedPerson?: ApplicationPacketParty;
  fitScoreSummary: ApplicationPacketFitScoreSummary;
  resumePlaceholder?: string;
  coverLetterPlaceholder?: string;
  recruiterMessagePlaceholder?: string;
  notes: string[];
  status: ApplicationPacketStatus;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationPacketInput {
  id?: string;
  userId?: string;
  jobId: string;
  companyId?: string;
  personId?: string;
  selectedJob: NormalizedJob;
  selectedCompany?: ApplicationPacketParty;
  selectedPerson?: ApplicationPacketParty;
  fitScoreSummary: {
    score: number;
    segment: JobSegment;
    highlights?: string[];
  };
  notes?: string[];
}

export interface ApplicationPacketListFilter {
  userId?: string;
  jobId?: string;
  status?: ApplicationPacketStatus;
  limit?: number;
}

export interface ApplicationPacketDraftFields {
  resumePlaceholder?: string;
  coverLetterPlaceholder?: string;
  recruiterMessagePlaceholder?: string;
  notes?: string[];
  status?: ApplicationPacketStatus;
  nextAction?: string;
}

export interface ApplicationPacketStore {
  create(record: ApplicationPacketRecord): Promise<ApplicationPacketRecord> | ApplicationPacketRecord;
  getById(id: string, currentUserId?: string): Promise<ApplicationPacketRecord | undefined> | ApplicationPacketRecord | undefined;
  list(filter?: ApplicationPacketListFilter): Promise<ApplicationPacketRecord[]> | ApplicationPacketRecord[];
  updateDraftFields(id: string, fields: ApplicationPacketDraftFields, currentUserId?: string): Promise<ApplicationPacketRecord> | ApplicationPacketRecord;
  updateStatus(id: string, status: ApplicationPacketStatus, nextAction?: string, currentUserId?: string): Promise<ApplicationPacketRecord> | ApplicationPacketRecord;
}

type PrismaDelegate = {
  upsert?(args: unknown): Promise<unknown>;
  create?(args: unknown): Promise<unknown>;
  update?(args: unknown): Promise<unknown>;
  findUnique?(args: unknown): Promise<unknown>;
  findFirst?(args: unknown): Promise<unknown>;
  findMany?(args: unknown): Promise<unknown[]>;
};

type PrismaApplicationPacketStoreClient = {
  user?: PrismaDelegate;
  company?: PrismaDelegate;
  job?: PrismaDelegate;
  person?: PrismaDelegate;
  application?: PrismaDelegate;
  applicationPacket?: PrismaDelegate;
  applicationStatusHistory?: PrismaDelegate;
};

const DEFAULT_USER_ID = "demo-user";

export function createApplicationPacketId(jobId: string) {
  return `packet_${jobId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function recordObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function requiredString(value: unknown, fallback: string) {
  return optionalString(value) ?? fallback;
}

function dateIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") return new Date(value).toISOString();
  return new Date().toISOString();
}

function numberFrom(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function normalizeStatus(value: unknown): ApplicationPacketStatus {
  const status = optionalString(value);
  if (["not_started", "ready_to_generate", "generated", "awaiting_review", "ready_to_apply", "submitted", "followup_due", "closed"].includes(status ?? "")) return status as ApplicationPacketStatus;
  return "not_started";
}

function normalizeFitScoreSummary(value: unknown): ApplicationPacketFitScoreSummary {
  const summary = recordObject(value);
  return {
    score: numberFrom(summary.score),
    segment: requiredString(summary.segment, "Unknown Clearance Risk") as JobSegment,
    highlights: stringArray(summary.highlights)
  };
}

function normalizeParty(value: unknown): ApplicationPacketParty | undefined {
  const party = recordObject(value);
  const name = optionalString(party.name);
  if (!name) return undefined;
  return { id: optionalString(party.id), name, email: optionalString(party.email) };
}

function selectedJobFromRow(packet: Record<string, unknown>) {
  const job = recordObject(packet.job);
  const company = recordObject(packet.company ?? job.company);
  const companyName = optionalString(company.name) ?? "Unknown company";
  return {
    title: requiredString(job.title, "Untitled role"),
    company: companyName,
    location: optionalString(job.location),
    description: optionalString(job.description),
    url: optionalString(job.url),
    source: "persisted",
    raw: { jobId: optionalString(packet.jobId) }
  } satisfies NormalizedJob;
}

export function toApplicationPacketRecord(row: unknown): ApplicationPacketRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const packet = row as Record<string, unknown>;
  const id = optionalString(packet.id);
  const jobId = optionalString(packet.jobId);
  if (!id || !jobId) return undefined;

  const application = recordObject(packet.application);
  const company = normalizeParty(packet.company) ?? normalizeParty(recordObject(packet.job).company);
  const person = normalizeParty(packet.person);
  const selectedJob = selectedJobFromRow(packet);
  const userId = optionalString(packet.userId) ?? optionalString(application.userId);

  return {
    id,
    userId,
    applicationId: optionalString(packet.applicationId),
    jobId,
    companyId: optionalString(packet.companyId),
    personId: optionalString(packet.personId),
    selectedJob,
    selectedCompany: company ?? { id: optionalString(packet.companyId), name: selectedJob.company },
    selectedPerson: person,
    fitScoreSummary: normalizeFitScoreSummary(packet.fitScoreSummary),
    resumePlaceholder: optionalString(packet.resumePlaceholder),
    coverLetterPlaceholder: optionalString(packet.coverLetterPlaceholder),
    recruiterMessagePlaceholder: optionalString(packet.recruiterMessagePlaceholder),
    notes: stringArray(packet.notes),
    status: normalizeStatus(packet.status),
    nextAction: optionalString(packet.nextAction) ?? nextActionForStatus(normalizeStatus(packet.status)),
    createdAt: dateIso(packet.createdAt),
    updatedAt: dateIso(packet.updatedAt)
  };
}

export function nextActionForStatus(status: ApplicationPacketStatus) {
  switch (status) {
    case "not_started":
      return "Create an application packet from a saved job.";
    case "ready_to_generate":
      return "Generate resume, cover letter, and recruiter-message drafts.";
    case "generated":
    case "awaiting_review":
      return "Review every draft against verified facts before applying.";
    case "ready_to_apply":
      return "Apply manually on the employer site; Career OS will not submit for you.";
    case "submitted":
      return "Record follow-up timing or close the packet if the role is no longer active.";
    case "followup_due":
      return "Write a human-reviewed follow-up; do not auto-send.";
    case "closed":
      return "Closed. Keep this packet as local evidence and history.";
  }
}

export class InMemoryApplicationPacketStore implements ApplicationPacketStore {
  private packets = new Map<string, ApplicationPacketRecord>();

  create(record: ApplicationPacketRecord) {
    this.packets.set(record.id, record);
    return record;
  }

  getById(id: string, currentUserId?: string) {
    const packet = this.packets.get(id);
    if (!packet || (currentUserId && packet.userId !== currentUserId)) return undefined;
    return packet;
  }

  list(filter: ApplicationPacketListFilter = {}) {
    const limit = filter.limit ?? 50;
    return [...this.packets.values()]
      .filter((packet) => !filter.userId || packet.userId === filter.userId)
      .filter((packet) => !filter.jobId || packet.jobId === filter.jobId)
      .filter((packet) => !filter.status || packet.status === filter.status)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  updateDraftFields(id: string, fields: ApplicationPacketDraftFields, currentUserId?: string) {
    const packet = this.getById(id, currentUserId);
    if (!packet) throw new Error(`Application packet not found: ${id}`);
    const updated: ApplicationPacketRecord = {
      ...packet,
      ...fields,
      status: fields.status ?? packet.status,
      nextAction: fields.nextAction ?? packet.nextAction,
      notes: fields.notes ?? packet.notes,
      updatedAt: new Date().toISOString()
    };
    this.packets.set(id, updated);
    return updated;
  }

  updateStatus(id: string, status: ApplicationPacketStatus, nextAction = nextActionForStatus(status), currentUserId?: string) {
    return this.updateDraftFields(id, { status, nextAction }, currentUserId);
  }

  clear() {
    this.packets.clear();
  }
}

export class PrismaApplicationPacketStore implements ApplicationPacketStore {
  constructor(private readonly client: PrismaApplicationPacketStoreClient = defaultPrisma as unknown as PrismaApplicationPacketStoreClient) {}

  async create(record: ApplicationPacketRecord) {
    const userId = record.userId ?? DEFAULT_USER_ID;
    const applicationId = record.applicationId ?? `application_${record.id}`;

    await this.ensureUser(userId);
    await this.ensureCompany(record);
    await this.ensureJob(record);
    await this.ensurePerson(record);

    await this.required(this.client.application?.upsert, "application.upsert").call(this.client.application, {
      where: { id: applicationId },
      create: {
        id: applicationId,
        userId,
        jobId: record.jobId,
        status: record.status,
        createdAt: new Date(record.createdAt)
      },
      update: {
        userId,
        jobId: record.jobId,
        status: record.status
      }
    });

    await this.required(this.client.applicationPacket?.upsert, "applicationPacket.upsert").call(this.client.applicationPacket, {
      where: { id: record.id },
      create: {
        id: record.id,
        userId,
        applicationId,
        jobId: record.jobId,
        companyId: record.companyId,
        personId: record.personId,
        fitScoreSummary: record.fitScoreSummary,
        resumePlaceholder: record.resumePlaceholder,
        coverLetterPlaceholder: record.coverLetterPlaceholder,
        recruiterMessagePlaceholder: record.recruiterMessagePlaceholder,
        notes: record.notes,
        status: record.status,
        nextAction: record.nextAction,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt)
      },
      update: {
        userId,
        applicationId,
        jobId: record.jobId,
        companyId: record.companyId,
        personId: record.personId,
        fitScoreSummary: record.fitScoreSummary,
        resumePlaceholder: record.resumePlaceholder,
        coverLetterPlaceholder: record.coverLetterPlaceholder,
        recruiterMessagePlaceholder: record.recruiterMessagePlaceholder,
        notes: record.notes,
        status: record.status,
        nextAction: record.nextAction
      }
    });

    await this.appendStatusHistory(applicationId, record.status);
    const saved = await this.getById(record.id, userId);
    if (!saved) throw new Error(`Application packet not found after save: ${record.id}`);
    return saved;
  }

  async getById(id: string, currentUserId?: string) {
    const row = await this.required(this.client.applicationPacket?.findUnique, "applicationPacket.findUnique").call(this.client.applicationPacket, {
      where: { id },
      include: this.relationInclude()
    });
    const packet = toApplicationPacketRecord(row);
    if (!packet || (currentUserId && packet.userId !== currentUserId)) return undefined;
    return packet;
  }

  async list(filter: ApplicationPacketListFilter = {}) {
    const rows = await this.required<unknown[]>(this.client.applicationPacket?.findMany, "applicationPacket.findMany").call(this.client.applicationPacket, {
      where: {
        ...(filter.jobId ? { jobId: filter.jobId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.userId ? { userId: filter.userId } : {})
      },
      include: this.relationInclude(),
      orderBy: { updatedAt: "desc" },
      take: filter.limit ?? 50
    });
    return rows.map(toApplicationPacketRecord).filter((packet): packet is ApplicationPacketRecord => Boolean(packet));
  }

  async updateDraftFields(id: string, fields: ApplicationPacketDraftFields, currentUserId?: string) {
    const existing = await this.getById(id, currentUserId);
    if (!existing) throw new Error(`Application packet not found: ${id}`);
    const status = fields.status ?? existing.status;
    await this.required(this.client.applicationPacket?.update, "applicationPacket.update").call(this.client.applicationPacket, {
      where: { id },
      data: {
        resumePlaceholder: fields.resumePlaceholder ?? existing.resumePlaceholder,
        coverLetterPlaceholder: fields.coverLetterPlaceholder ?? existing.coverLetterPlaceholder,
        recruiterMessagePlaceholder: fields.recruiterMessagePlaceholder ?? existing.recruiterMessagePlaceholder,
        notes: fields.notes ?? existing.notes,
        status,
        nextAction: fields.nextAction ?? existing.nextAction
      }
    });
    if (existing.applicationId && status !== existing.status) {
      await this.required(this.client.application?.update, "application.update").call(this.client.application, { where: { id: existing.applicationId }, data: { status } });
      await this.appendStatusHistory(existing.applicationId, status);
    }
    const updated = await this.getById(id, currentUserId);
    if (!updated) throw new Error(`Application packet not found after update: ${id}`);
    return updated;
  }

  async updateStatus(id: string, status: ApplicationPacketStatus, nextAction = nextActionForStatus(status), currentUserId?: string) {
    return this.updateDraftFields(id, { status, nextAction }, currentUserId);
  }

  private relationInclude() {
    return {
      application: true,
      job: { include: { company: true } },
      company: true,
      person: true
    };
  }

  private async ensureUser(userId: string) {
    if (!this.client.user?.upsert) return;
    await this.client.user.upsert({
      where: { id: userId },
      create: { id: userId, email: `${userId}@career-os.local`, name: "Career OS User" },
      update: {}
    });
  }

  private async ensureCompany(record: ApplicationPacketRecord) {
    if (!record.companyId || !this.client.company?.upsert) return;
    await this.client.company.upsert({
      where: { id: record.companyId },
      create: { id: record.companyId, name: record.selectedCompany?.name ?? record.selectedJob.company },
      update: { name: record.selectedCompany?.name ?? record.selectedJob.company }
    });
  }

  private async ensureJob(record: ApplicationPacketRecord) {
    if (!this.client.job?.upsert) return;
    await this.client.job.upsert({
      where: { id: record.jobId },
      create: {
        id: record.jobId,
        userId: record.userId,
        companyId: record.companyId,
        title: record.selectedJob.title,
        location: record.selectedJob.location,
        description: record.selectedJob.description,
        url: record.selectedJob.url,
        status: "packet_created",
        createdAt: new Date(record.createdAt)
      },
      update: {
        userId: record.userId,
        companyId: record.companyId,
        title: record.selectedJob.title,
        location: record.selectedJob.location,
        description: record.selectedJob.description,
        url: record.selectedJob.url
      }
    });
  }

  private async ensurePerson(record: ApplicationPacketRecord) {
    if (!record.personId || !record.selectedPerson || !this.client.person?.upsert) return;
    await this.client.person.upsert({
      where: { id: record.personId },
      create: { id: record.personId, name: record.selectedPerson.name, currentCompanyId: record.companyId, companyName: record.selectedCompany?.name },
      update: { name: record.selectedPerson.name, currentCompanyId: record.companyId, companyName: record.selectedCompany?.name }
    });
  }

  private async appendStatusHistory(applicationId: string, status: ApplicationPacketStatus) {
    if (!this.client.applicationStatusHistory?.create) return;
    await this.client.applicationStatusHistory.create({ data: { applicationId, status } });
  }

  private required<TResult = unknown>(method: ((args: unknown) => Promise<TResult>) | undefined, name: string) {
    if (!method) throw new Error(`APPLICATION_PACKET_STORE_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose ${name}. Run \`npx prisma generate\` and restart.`);
    return method;
  }
}

export const applicationPacketStore = new InMemoryApplicationPacketStore();
export const prismaApplicationPacketStore = new PrismaApplicationPacketStore();

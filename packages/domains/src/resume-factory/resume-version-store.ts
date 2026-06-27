import { prisma as defaultPrisma } from "@career-os/db";
import type { ResumeReviewChecklistItem, ResumeSectionKey, ResumeTemplateKey } from "./resume-templates";
import type { TechnicalResumeDraft } from "./workers/technical-resume-worker";

export interface ResumeVersionRecord {
  id: string;
  masterResumeId?: string;
  jobId?: string;
  companyId?: string;
  content: unknown;
  templateId?: string;
  templateKey?: string;
  sectionOrder: string[];
  reviewChecklist?: ResumeReviewChecklistItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResumeVersionSaveInput {
  draft: TechnicalResumeDraft;
  masterResumeId?: string;
  templateKey: ResumeTemplateKey;
  sectionOrder: ResumeSectionKey[];
  reviewChecklist: ResumeReviewChecklistItem[];
}

export interface ResumeVersionStore {
  save(input: ResumeVersionSaveInput): Promise<ResumeVersionRecord> | ResumeVersionRecord;
  getById(id: string): Promise<ResumeVersionRecord | undefined> | ResumeVersionRecord | undefined;
}

type PrismaResumeVersionLike = {
  resumeVersion?: {
    upsert(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
  };
};

function toRecord(row: unknown): ResumeVersionRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as ResumeVersionRecord;
  return {
    ...record,
    masterResumeId: record.masterResumeId ?? undefined,
    jobId: record.jobId ?? undefined,
    companyId: record.companyId ?? undefined,
    templateId: record.templateId ?? undefined,
    templateKey: record.templateKey ?? undefined,
    sectionOrder: Array.isArray(record.sectionOrder) ? record.sectionOrder : [],
    reviewChecklist: Array.isArray(record.reviewChecklist) ? record.reviewChecklist : undefined,
    createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined
  };
}

export class InMemoryResumeVersionStore implements ResumeVersionStore {
  private versions = new Map<string, ResumeVersionRecord>();

  save(input: ResumeVersionSaveInput) {
    const now = new Date();
    const existing = this.versions.get(input.draft.id);
    const record: ResumeVersionRecord = {
      id: input.draft.id,
      masterResumeId: input.masterResumeId,
      jobId: input.draft.jobId,
      companyId: input.draft.companyId,
      content: input.draft,
      templateId: input.templateKey,
      templateKey: input.templateKey,
      sectionOrder: input.sectionOrder,
      reviewChecklist: input.reviewChecklist,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.versions.set(record.id, record);
    return record;
  }

  getById(id: string) {
    return this.versions.get(id);
  }

  clear() {
    this.versions.clear();
  }
}

export class PrismaResumeVersionStore implements ResumeVersionStore {
  constructor(private readonly client: PrismaResumeVersionLike = defaultPrisma as unknown as PrismaResumeVersionLike) {}

  async save(input: ResumeVersionSaveInput) {
    if (!this.client.resumeVersion) throw new Error("RESUME_VERSION_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose resumeVersion. Run `npx prisma generate` and restart `npm run dev`.");
    const data = {
      id: input.draft.id,
      masterResumeId: input.masterResumeId,
      jobId: input.draft.jobId,
      companyId: input.draft.companyId,
      content: input.draft,
      templateId: input.templateKey,
      templateKey: input.templateKey,
      sectionOrder: input.sectionOrder,
      reviewChecklist: input.reviewChecklist
    };
    const row = await this.client.resumeVersion.upsert({ where: { id: data.id }, create: data, update: data });
    const record = toRecord(row);
    if (!record) throw new Error("Failed to persist resume version.");
    return record;
  }

  async getById(id: string) {
    if (!this.client.resumeVersion) return undefined;
    return toRecord(await this.client.resumeVersion.findUnique({ where: { id } }));
  }
}

export const resumeVersionStore = new InMemoryResumeVersionStore();
export const prismaResumeVersionStore = new PrismaResumeVersionStore();

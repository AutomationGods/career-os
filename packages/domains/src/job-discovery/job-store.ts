import { createHash } from "node:crypto";
import { prisma as defaultPrisma } from "@career-os/db";
import type { JobSegment, NormalizedJob } from "@career-os/shared";

export interface ManualJobImportInput {
  id?: string;
  jobId?: string;
  userId?: string;
  url?: string;
  title: string;
  companyName?: string;
  company?: string;
  companyId?: string;
  location?: string;
  description: string;
  employmentType?: string;
  source?: string;
  certifications?: string[];
  requiredFields?: string[];
  hasEasyApply?: boolean;
  status?: string;
}

export interface JobStoreListFilter {
  userId?: string;
  segment?: JobSegment | string;
  status?: string;
  limit?: number;
}

export interface PersistedCompanyRecord {
  id: string;
  name: string;
  website?: string;
  industry?: string;
}

export interface PersistedJobSourceRecord {
  id: string;
  jobId: string;
  source: string;
  url?: string;
}

export interface PersistedJobSnapshotRecord {
  id: string;
  jobId: string;
  content: unknown;
  capturedAt: Date;
}

export interface PersistedJobSkillRecord {
  id: string;
  jobId: string;
  skill: string;
}

export interface PersistedJobCertificationRecord {
  id: string;
  jobId: string;
  certification: string;
  required: boolean;
}

export interface PersistedJobClearanceFlagRecord {
  id: string;
  jobId: string;
  flag: string;
  evidence?: string;
}

export interface PersistedJobRemoteClassificationRecord {
  id: string;
  jobId: string;
  classification: string;
  confidence?: number;
}

export interface PersistedJobSegmentRecord {
  id: string;
  jobId: string;
  segment: JobSegment;
  reason?: string;
}

export interface PersistedJobScoreRecord {
  id: string;
  jobId: string;
  score: number;
  evidence?: unknown;
}

export interface PersistedPipelineResult {
  normalizedJob: NormalizedJob;
  remoteClassification: string;
  clearanceSegment: JobSegment | null;
  certificationClassification: { required: string[]; preferred: string[]; blocked: string[] };
  fitScore: number;
  applicationDifficultyScore: number;
  dashboardSegment: JobSegment;
  sourceSnapshotId?: string;
  updatedAt: string;
}

export interface PersistedJobRecord {
  id: string;
  userId?: string;
  companyId?: string;
  title: string;
  location?: string;
  description?: string;
  url?: string;
  status: string;
  employmentType?: string;
  source?: string;
  createdAt: Date;
  company?: PersistedCompanyRecord;
  sources: PersistedJobSourceRecord[];
  latestSnapshot?: PersistedJobSnapshotRecord;
  skills: PersistedJobSkillRecord[];
  certifications: PersistedJobCertificationRecord[];
  clearanceFlags: PersistedJobClearanceFlagRecord[];
  remoteClassifications: PersistedJobRemoteClassificationRecord[];
  segments: PersistedJobSegmentRecord[];
  fitScores: PersistedJobScoreRecord[];
  difficultyScores: PersistedJobScoreRecord[];
  latestPipelineResult?: PersistedPipelineResult;
}

export interface SavePipelineResultInput {
  jobId?: string;
  id?: string;
  userId?: string;
  companyId?: string;
  companyName?: string;
  sourceSnapshotId?: string;
  input: Partial<ManualJobImportInput> & Record<string, unknown>;
  normalizedJob: NormalizedJob;
  remoteClassification: string;
  clearanceSegment: JobSegment | null;
  certificationClassification: { required: string[]; preferred: string[]; blocked: string[] };
  fitScore: number;
  applicationDifficultyScore: number;
  dashboardSegment: JobSegment;
}

export interface JobStore {
  savePipelineResult(input: SavePipelineResultInput): Promise<PersistedJobRecord> | PersistedJobRecord;
  getById(id: string): Promise<PersistedJobRecord | undefined> | PersistedJobRecord | undefined;
  list(filter?: JobStoreListFilter): Promise<PersistedJobRecord[]> | PersistedJobRecord[];
}

type PreparedPersistedJob = Omit<PersistedJobRecord, "sources" | "latestSnapshot" | "skills" | "certifications" | "clearanceFlags" | "remoteClassifications" | "segments" | "fitScores" | "difficultyScores"> & {
  sources: Omit<PersistedJobSourceRecord, "id">[];
  latestSnapshot: Omit<PersistedJobSnapshotRecord, "id">;
  skills: Omit<PersistedJobSkillRecord, "id">[];
  certifications: Omit<PersistedJobCertificationRecord, "id">[];
  clearanceFlags: Omit<PersistedJobClearanceFlagRecord, "id">[];
  remoteClassifications: Omit<PersistedJobRemoteClassificationRecord, "id">[];
  segments: Omit<PersistedJobSegmentRecord, "id">[];
  fitScores: Omit<PersistedJobScoreRecord, "id">[];
  difficultyScores: Omit<PersistedJobScoreRecord, "id">[];
};

type PrismaDelegate = {
  upsert?(args: unknown): Promise<unknown>;
  create?(args: unknown): Promise<unknown>;
  createMany?(args: unknown): Promise<unknown>;
  deleteMany?(args: unknown): Promise<unknown>;
  findUnique?(args: unknown): Promise<unknown>;
  findMany?(args: unknown): Promise<unknown[]>;
};

type PrismaJobStoreClient = {
  company: PrismaDelegate;
  job: PrismaDelegate;
  jobSource: PrismaDelegate;
  jobSnapshot: PrismaDelegate;
  jobSkill: PrismaDelegate;
  jobCertification: PrismaDelegate;
  jobClearanceFlag: PrismaDelegate;
  jobRemoteClassification: PrismaDelegate;
  jobSegment: PrismaDelegate;
  jobFitScore: PrismaDelegate;
  jobApplicationDifficultyScore: PrismaDelegate;
};

const preferredSkills = ["splunk", "cribl", "devops", "siem", "linux", "terraform", "aws", "azure", "gcp", "observability", "sre", "detection engineering"];

const segmentToPrismaValue: Record<JobSegment, string> = {
  "Remote Commercial": "REMOTE_COMMERCIAL",
  "Hybrid Commercial": "HYBRID_COMMERCIAL",
  "Onsite Commercial": "ONSITE_COMMERCIAL",
  Contract: "CONTRACT",
  "Clearance / Government": "CLEARANCE_GOVERNMENT",
  "Public Trust": "PUBLIC_TRUST",
  Secret: "SECRET",
  "Top Secret": "TOP_SECRET",
  "TS/SCI": "TS_SCI",
  Polygraph: "POLYGRAPH",
  "Clearance Eligible": "CLEARANCE_ELIGIBLE",
  "Unknown Clearance Risk": "UNKNOWN_CLEARANCE_RISK",
  "Low Fit": "LOW_FIT",
  "Archived / Rejected": "ARCHIVED_REJECTED"
};

const prismaValueToSegment = Object.fromEntries(Object.entries(segmentToPrismaValue).map(([segment, value]) => [value, segment])) as Record<string, JobSegment>;

export function slugifyCompanyName(companyName: string) {
  const slug = companyName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "unknown-company";
}

export function createDeterministicCompanyId(companyName: string) {
  return `company_${slugifyCompanyName(companyName)}`;
}

export function createDeterministicJobId(input: Pick<ManualJobImportInput, "url" | "title" | "companyName" | "company" | "location">) {
  const basis = input.url?.trim() || `${input.title}|${input.companyName ?? input.company ?? ""}|${input.location ?? ""}`;
  const digest = createHash("sha256").update(basis.toLowerCase().trim()).digest("hex").slice(0, 16);
  return `job_${digest}`;
}

export function mapJobSegmentToPrisma(segment: JobSegment) {
  return segmentToPrismaValue[segment];
}

export function mapPrismaSegmentToJobSegment(segment: string): JobSegment {
  return prismaValueToSegment[segment] ?? "Unknown Clearance Risk";
}

function uniqueStrings(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function extractSkills(job: NormalizedJob) {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  return preferredSkills.filter((skill) => text.includes(skill));
}

function createChildId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildPipelineResult(input: SavePipelineResultInput): PersistedPipelineResult {
  return {
    normalizedJob: input.normalizedJob,
    remoteClassification: input.remoteClassification,
    clearanceSegment: input.clearanceSegment,
    certificationClassification: input.certificationClassification,
    fitScore: input.fitScore,
    applicationDifficultyScore: input.applicationDifficultyScore,
    dashboardSegment: input.dashboardSegment,
    sourceSnapshotId: input.sourceSnapshotId,
    updatedAt: new Date().toISOString()
  };
}

function preparePipelineSave(input: SavePipelineResultInput): PreparedPersistedJob {
  const companyName = input.companyName ?? optionalString(input.input.companyName) ?? optionalString(input.input.company) ?? input.normalizedJob.company;
  const jobIdentityInput = {
    url: input.normalizedJob.url ?? optionalString(input.input.url),
    title: input.normalizedJob.title,
    companyName,
    location: input.normalizedJob.location
  };
  const jobId = input.jobId ?? input.id ?? optionalString(input.input.jobId) ?? optionalString(input.input.id) ?? createDeterministicJobId(jobIdentityInput);
  const companyId = input.companyId ?? optionalString(input.input.companyId) ?? createDeterministicCompanyId(companyName);
  const source = input.normalizedJob.source || optionalString(input.input.source) || "manual";
  const requiredCertifications = uniqueStrings(input.certificationClassification.required);
  const allCertifications = uniqueStrings([...requiredCertifications, ...input.certificationClassification.preferred, ...input.certificationClassification.blocked, ...(Array.isArray(input.input.certifications) ? input.input.certifications.filter((value): value is string => typeof value === "string") : [])]);
  const now = new Date();
  const latestPipelineResult = buildPipelineResult(input);
  const snapshotContent = {
    userId: input.userId ?? optionalString(input.input.userId),
    input: input.input,
    normalizedJob: input.normalizedJob,
    latestPipelineResult,
    sourceSnapshotId: input.sourceSnapshotId,
    capturedBy: "job-discovery"
  };

  return {
    id: jobId,
    userId: input.userId ?? optionalString(input.input.userId),
    companyId,
    title: input.normalizedJob.title,
    location: input.normalizedJob.location,
    description: input.normalizedJob.description,
    url: input.normalizedJob.url,
    status: optionalString(input.input.status) ?? "discovered",
    employmentType: input.normalizedJob.employmentType,
    source,
    createdAt: now,
    company: { id: companyId, name: companyName },
    sources: [{ jobId, source, url: input.normalizedJob.url }],
    latestSnapshot: { jobId, content: snapshotContent, capturedAt: now },
    skills: extractSkills(input.normalizedJob).map((skill) => ({ jobId, skill })),
    certifications: allCertifications.map((certification) => ({ jobId, certification, required: requiredCertifications.includes(certification) })),
    clearanceFlags: input.clearanceSegment ? [{ jobId, flag: input.clearanceSegment, evidence: input.clearanceSegment }] : [],
    remoteClassifications: [{ jobId, classification: input.remoteClassification, confidence: 1 }],
    segments: [{ jobId, segment: input.dashboardSegment, reason: "B1 job pipeline dashboard segment" }],
    fitScores: [{ jobId, score: input.fitScore, evidence: { source: "job.pipeline" } }],
    difficultyScores: [{ jobId, score: input.applicationDifficultyScore, evidence: { requiredFields: input.input.requiredFields, hasEasyApply: input.input.hasEasyApply } }],
    latestPipelineResult
  };
}

function withChildIds(prepared: PreparedPersistedJob, existingCreatedAt?: Date): PersistedJobRecord {
  const snapshotId = createChildId("job_snapshot");
  return {
    ...prepared,
    createdAt: existingCreatedAt ?? prepared.createdAt,
    sources: prepared.sources.map((source) => ({ id: createChildId("job_source"), ...source })),
    latestSnapshot: { id: snapshotId, ...prepared.latestSnapshot },
    skills: prepared.skills.map((skill) => ({ id: createChildId("job_skill"), ...skill })),
    certifications: prepared.certifications.map((certification) => ({ id: createChildId("job_certification"), ...certification })),
    clearanceFlags: prepared.clearanceFlags.map((flag) => ({ id: createChildId("job_clearance"), ...flag })),
    remoteClassifications: prepared.remoteClassifications.map((classification) => ({ id: createChildId("job_remote"), ...classification })),
    segments: prepared.segments.map((segment) => ({ id: createChildId("job_segment"), ...segment })),
    fitScores: prepared.fitScores.map((score) => ({ id: createChildId("job_fit"), ...score })),
    difficultyScores: prepared.difficultyScores.map((score) => ({ id: createChildId("job_difficulty"), ...score }))
  };
}

function matchesFilter(job: PersistedJobRecord, filter: JobStoreListFilter = {}) {
  if (filter.userId && job.userId !== filter.userId) return false;
  if (filter.status && job.status !== filter.status) return false;
  if (filter.segment && !job.segments.some((segment) => segment.segment === filter.segment)) return false;
  return true;
}

function recordObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function dateFrom(value: unknown) {
  return value instanceof Date ? value : new Date(typeof value === "string" || typeof value === "number" ? value : Date.now());
}

function numberFrom(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function toPersistedJobRecord(row: unknown): PersistedJobRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as Record<string, unknown>;
  const snapshots = Array.isArray(record.snapshots) ? record.snapshots.map(recordObject) : [];
  const latestSnapshotRow = snapshots[0];
  const latestSnapshot = latestSnapshotRow ? {
    id: String(latestSnapshotRow.id),
    jobId: String(latestSnapshotRow.jobId),
    content: latestSnapshotRow.content,
    capturedAt: dateFrom(latestSnapshotRow.capturedAt)
  } : undefined;
  const snapshotContent = recordObject(latestSnapshot?.content);
  const rawPipelineResult = recordObject(snapshotContent.latestPipelineResult);
  const latestPipelineResult = rawPipelineResult.normalizedJob ? rawPipelineResult as unknown as PersistedPipelineResult : undefined;
  const companyRow = recordObject(record.company);
  const company = companyRow.id ? { id: String(companyRow.id), name: String(companyRow.name), website: optionalString(companyRow.website), industry: optionalString(companyRow.industry) } : undefined;
  const sources = Array.isArray(record.sources) ? record.sources.map((source) => {
    const item = recordObject(source);
    return { id: String(item.id), jobId: String(item.jobId), source: String(item.source), url: optionalString(item.url) };
  }) : [];
  const remoteClassifications = Array.isArray(record.remoteClassifications) ? record.remoteClassifications.map((classification) => {
    const item = recordObject(classification);
    return { id: String(item.id), jobId: String(item.jobId), classification: String(item.classification), confidence: typeof item.confidence === "number" ? item.confidence : undefined };
  }) : [];
  const segments = Array.isArray(record.segments) ? record.segments.map((segment) => {
    const item = recordObject(segment);
    return { id: String(item.id), jobId: String(item.jobId), segment: mapPrismaSegmentToJobSegment(String(item.segment)), reason: optionalString(item.reason) };
  }) : [];

  return {
    id: String(record.id),
    userId: optionalString(snapshotContent.userId),
    companyId: optionalString(record.companyId),
    title: String(record.title),
    location: optionalString(record.location),
    description: optionalString(record.description),
    url: optionalString(record.url),
    status: String(record.status ?? "discovered"),
    employmentType: optionalString((latestPipelineResult?.normalizedJob as NormalizedJob | undefined)?.employmentType),
    source: sources[0]?.source,
    createdAt: dateFrom(record.createdAt),
    company,
    sources,
    latestSnapshot,
    skills: Array.isArray(record.skills) ? record.skills.map((skill) => {
      const item = recordObject(skill);
      return { id: String(item.id), jobId: String(item.jobId), skill: String(item.skill) };
    }) : [],
    certifications: Array.isArray(record.certifications) ? record.certifications.map((certification) => {
      const item = recordObject(certification);
      return { id: String(item.id), jobId: String(item.jobId), certification: String(item.certification), required: item.required === true };
    }) : [],
    clearanceFlags: Array.isArray(record.clearanceFlags) ? record.clearanceFlags.map((flag) => {
      const item = recordObject(flag);
      return { id: String(item.id), jobId: String(item.jobId), flag: String(item.flag), evidence: optionalString(item.evidence) };
    }) : [],
    remoteClassifications,
    segments,
    fitScores: Array.isArray(record.fitScores) ? record.fitScores.map((score) => {
      const item = recordObject(score);
      return { id: String(item.id), jobId: String(item.jobId), score: numberFrom(item.score), evidence: item.evidence };
    }) : [],
    difficultyScores: Array.isArray(record.difficultyScores) ? record.difficultyScores.map((score) => {
      const item = recordObject(score);
      return { id: String(item.id), jobId: String(item.jobId), score: numberFrom(item.score), evidence: item.evidence };
    }) : [],
    latestPipelineResult
  };
}

function relationInclude() {
  return {
    company: true,
    sources: true,
    snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
    skills: true,
    certifications: true,
    clearanceFlags: true,
    remoteClassifications: true,
    segments: true,
    fitScores: true,
    difficultyScores: true
  };
}

export class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, PersistedJobRecord>();

  savePipelineResult(input: SavePipelineResultInput) {
    const prepared = preparePipelineSave(input);
    const existing = this.jobs.get(prepared.id);
    const saved = withChildIds(prepared, existing?.createdAt);
    this.jobs.set(saved.id, saved);
    return saved;
  }

  getById(id: string) {
    return this.jobs.get(id);
  }

  list(filter: JobStoreListFilter = {}) {
    const filtered = [...this.jobs.values()].filter((job) => matchesFilter(job, filter)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return typeof filter.limit === "number" ? filtered.slice(0, Math.max(0, filter.limit)) : filtered;
  }

  clear() {
    this.jobs.clear();
  }
}

export class PrismaJobStore implements JobStore {
  constructor(private readonly client: PrismaJobStoreClient = defaultPrisma as unknown as PrismaJobStoreClient) {}

  async savePipelineResult(input: SavePipelineResultInput) {
    const prepared = preparePipelineSave(input);
    await this.required(this.client.company.upsert, "company.upsert").call(this.client.company, {
      where: { id: prepared.companyId },
      create: { id: prepared.companyId, name: prepared.company?.name ?? prepared.title },
      update: { name: prepared.company?.name ?? prepared.title }
    });
    await this.required(this.client.job.upsert, "job.upsert").call(this.client.job, {
      where: { id: prepared.id },
      create: {
        id: prepared.id,
        companyId: prepared.companyId,
        title: prepared.title,
        location: prepared.location,
        description: prepared.description,
        url: prepared.url,
        status: prepared.status,
        createdAt: prepared.createdAt
      },
      update: {
        companyId: prepared.companyId,
        title: prepared.title,
        location: prepared.location,
        description: prepared.description,
        url: prepared.url,
        status: prepared.status
      }
    });

    await Promise.all([
      this.deleteMany(this.client.jobSource, prepared.id),
      this.deleteMany(this.client.jobSkill, prepared.id),
      this.deleteMany(this.client.jobCertification, prepared.id),
      this.deleteMany(this.client.jobClearanceFlag, prepared.id),
      this.deleteMany(this.client.jobRemoteClassification, prepared.id),
      this.deleteMany(this.client.jobSegment, prepared.id),
      this.deleteMany(this.client.jobFitScore, prepared.id),
      this.deleteMany(this.client.jobApplicationDifficultyScore, prepared.id)
    ]);

    await Promise.all([
      this.createMany(this.client.jobSource, prepared.sources),
      this.createMany(this.client.jobSkill, prepared.skills),
      this.createMany(this.client.jobCertification, prepared.certifications),
      this.createMany(this.client.jobClearanceFlag, prepared.clearanceFlags),
      this.createMany(this.client.jobRemoteClassification, prepared.remoteClassifications),
      this.createMany(this.client.jobSegment, prepared.segments.map((segment) => ({ ...segment, segment: mapJobSegmentToPrisma(segment.segment) }))),
      this.createMany(this.client.jobFitScore, prepared.fitScores),
      this.createMany(this.client.jobApplicationDifficultyScore, prepared.difficultyScores)
    ]);

    await this.required(this.client.jobSnapshot.create, "jobSnapshot.create").call(this.client.jobSnapshot, {
      data: { jobId: prepared.id, content: prepared.latestSnapshot.content, capturedAt: prepared.latestSnapshot.capturedAt }
    });

    const saved = await this.getById(prepared.id);
    if (!saved) throw new Error(`Persisted job not found after save: ${prepared.id}`);
    return saved;
  }

  async getById(id: string) {
    const findUnique = this.required(this.client.job.findUnique, "job.findUnique");
    const row = await findUnique.call(this.client.job, { where: { id }, include: relationInclude() });
    return toPersistedJobRecord(row);
  }

  async list(filter: JobStoreListFilter = {}) {
    const findMany = this.required<unknown[]>(this.client.job.findMany, "job.findMany");
    const rows = await findMany.call(this.client.job, {
      where: filter.status ? { status: filter.status } : undefined,
      include: relationInclude(),
      orderBy: { createdAt: "desc" },
      take: typeof filter.limit === "number" ? Math.max(filter.limit * 5, filter.limit, 25) : undefined
    });
    const records = rows.map(toPersistedJobRecord).filter((job): job is PersistedJobRecord => Boolean(job)).filter((job) => matchesFilter(job, filter));
    return typeof filter.limit === "number" ? records.slice(0, Math.max(0, filter.limit)) : records;
  }

  private required<TResult = unknown>(method: ((args: unknown) => Promise<TResult>) | undefined, name: string) {
    if (!method) throw new Error(`JOB_STORE_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose ${name}. Run \`npx prisma generate\` and restart.`);
    return method;
  }

  private async deleteMany(delegate: PrismaDelegate, jobId: string) {
    if (!delegate.deleteMany) return;
    await delegate.deleteMany({ where: { jobId } });
  }

  private async createMany(delegate: PrismaDelegate, data: unknown[]) {
    if (data.length === 0) return;
    if (delegate.createMany) {
      await delegate.createMany({ data });
      return;
    }
    if (!delegate.create) throw new Error("JOB_STORE_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose create/createMany for a job child table.");
    await Promise.all(data.map((row) => delegate.create?.({ data: row })));
  }
}

export const prismaJobStore = new PrismaJobStore();

export const JOBS_DEMO_USER_ID = "demo-user";
export const DEFAULT_JOB_SEGMENT = "Unsegmented";

export interface JobSourceView {
  id?: string;
  source?: string;
  url?: string;
}

export interface JobSnapshotView {
  id: string;
  capturedAt?: string;
}

export interface JobSegmentView {
  segment: string;
  reason?: string;
}

export interface JobScoreView {
  score: number;
}

export interface JobCompanyView {
  id?: string;
  name?: string;
}

export interface PersistedJobView {
  id: string;
  userId?: string;
  companyId?: string;
  title: string;
  company?: JobCompanyView;
  location?: string;
  description?: string;
  url?: string;
  status?: string;
  employmentType?: string;
  source?: string;
  sources: JobSourceView[];
  latestSnapshot?: JobSnapshotView;
  segments: JobSegmentView[];
  fitScores: JobScoreView[];
  difficultyScores: JobScoreView[];
  latestPipelineResult?: {
    dashboardSegment?: string;
    fitScore?: number;
    applicationDifficultyScore?: number;
    sourceSnapshotId?: string;
  };
}

export interface ManualJobFormFields {
  userId: string;
  url: string;
  title: string;
  companyName: string;
  location: string;
  employmentType: string;
  description: string;
  certificationsText: string;
  requiredFieldsText: string;
  hasEasyApply: boolean;
}

export interface ManualJobImportPayload {
  userId?: string;
  url?: string;
  title: string;
  companyName: string;
  location?: string;
  employmentType?: string;
  description: string;
  certifications: string[];
  requiredFields: string[];
  hasEasyApply?: boolean;
  source: "manual";
}

export interface ResumePayloadDefaults {
  userId?: string;
  jobId: string;
  companyId?: string;
  applicationPacketId: string;
  targetRole: string;
  companyName?: string;
  jobDescription?: string;
}

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArrayFromText(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function dataResult(envelope: unknown) {
  if (!isRecord(envelope) || envelope.ok !== true || !isRecord(envelope.data)) return undefined;
  return isRecord(envelope.data.result) ? envelope.data.result : envelope.data;
}

function normalizeSource(value: unknown): JobSourceView | undefined {
  if (!isRecord(value)) return undefined;
  return { id: asOptionalString(value.id), source: asOptionalString(value.source), url: asOptionalString(value.url) };
}

function normalizeSegment(value: unknown): JobSegmentView | undefined {
  if (!isRecord(value)) return undefined;
  const segment = asString(value.segment);
  if (!segment) return undefined;
  return { segment, reason: asOptionalString(value.reason) };
}

function normalizeScore(value: unknown): JobScoreView | undefined {
  if (!isRecord(value)) return undefined;
  return { score: asNumber(value.score) };
}

function normalizeJobSnapshot(value: unknown): JobSnapshotView | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id);
  if (!id) return undefined;
  return { id, capturedAt: asOptionalString(value.capturedAt) };
}

export function normalizePersistedJob(value: unknown): PersistedJobView | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id);
  const title = asString(value.title);
  if (!id || !title) return undefined;
  const company = isRecord(value.company) ? { id: asOptionalString(value.company.id), name: asOptionalString(value.company.name) } : undefined;
  const latestPipelineResult = isRecord(value.latestPipelineResult) ? {
    dashboardSegment: asOptionalString(value.latestPipelineResult.dashboardSegment),
    fitScore: typeof value.latestPipelineResult.fitScore === "number" ? value.latestPipelineResult.fitScore : undefined,
    applicationDifficultyScore: typeof value.latestPipelineResult.applicationDifficultyScore === "number" ? value.latestPipelineResult.applicationDifficultyScore : undefined,
    sourceSnapshotId: asOptionalString(value.latestPipelineResult.sourceSnapshotId)
  } : undefined;

  return {
    id,
    userId: asOptionalString(value.userId),
    companyId: asOptionalString(value.companyId),
    title,
    company,
    location: asOptionalString(value.location),
    description: asOptionalString(value.description),
    url: asOptionalString(value.url),
    status: asOptionalString(value.status),
    employmentType: asOptionalString(value.employmentType),
    source: asOptionalString(value.source),
    sources: Array.isArray(value.sources) ? value.sources.map(normalizeSource).filter((source): source is JobSourceView => Boolean(source)) : [],
    latestSnapshot: normalizeJobSnapshot(value.latestSnapshot),
    segments: Array.isArray(value.segments) ? value.segments.map(normalizeSegment).filter((segment): segment is JobSegmentView => Boolean(segment)) : [],
    fitScores: Array.isArray(value.fitScores) ? value.fitScores.map(normalizeScore).filter((score): score is JobScoreView => Boolean(score)) : [],
    difficultyScores: Array.isArray(value.difficultyScores) ? value.difficultyScores.map(normalizeScore).filter((score): score is JobScoreView => Boolean(score)) : [],
    latestPipelineResult
  };
}

export function jobsFromListEnvelope(envelope: unknown): PersistedJobView[] {
  const result = dataResult(envelope);
  const jobs = isRecord(result) && Array.isArray(result.jobs) ? result.jobs : [];
  return jobs.map(normalizePersistedJob).filter((job): job is PersistedJobView => Boolean(job));
}

export function jobFromImportEnvelope(envelope: unknown): PersistedJobView | undefined {
  const result = dataResult(envelope);
  return isRecord(result) ? normalizePersistedJob(result.job) : undefined;
}

export function segmentForJob(job: PersistedJobView) {
  return job.segments[0]?.segment ?? job.latestPipelineResult?.dashboardSegment ?? DEFAULT_JOB_SEGMENT;
}

export function fitScoreForJob(job: PersistedJobView) {
  return job.fitScores[0]?.score ?? job.latestPipelineResult?.fitScore ?? 0;
}

export function difficultyScoreForJob(job: PersistedJobView) {
  return job.difficultyScores[0]?.score ?? job.latestPipelineResult?.applicationDifficultyScore ?? 0;
}

export function snapshotIdForJob(job: PersistedJobView) {
  return job.latestSnapshot?.id ?? job.latestPipelineResult?.sourceSnapshotId ?? "n/a";
}

export function groupJobsByDashboardSegment(jobs: PersistedJobView[]) {
  return jobs.reduce<Record<string, PersistedJobView[]>>((groups, job) => {
    const segment = segmentForJob(job);
    return { ...groups, [segment]: [...(groups[segment] ?? []), job] };
  }, {});
}

export function buildSafeDemoJobPayload(overrides: Partial<ManualJobImportPayload> = {}): ManualJobImportPayload {
  return {
    userId: JOBS_DEMO_USER_ID,
    url: "https://example.test/careers/splunk-cribl-platform-engineer",
    title: "Splunk / Cribl Platform Engineer",
    companyName: "Demo Commercial Company",
    location: "Remote",
    employmentType: "Full-time",
    description: "Manual pasted description: Splunk, Cribl, SIEM, Linux, Terraform, AWS, Azure, GCP, and observability platform engineering. Remote commercial role. No external fetching, scraping, upload, submission, or auto-apply.",
    certifications: [],
    requiredFields: ["name", "email", "resume"],
    hasEasyApply: true,
    source: "manual",
    ...overrides
  };
}

export function buildManualJobImportPayload(fields: ManualJobFormFields): ManualJobImportPayload {
  return buildSafeDemoJobPayload({
    userId: fields.userId || undefined,
    url: fields.url || undefined,
    title: fields.title,
    companyName: fields.companyName,
    location: fields.location || undefined,
    employmentType: fields.employmentType || undefined,
    description: fields.description,
    certifications: asStringArrayFromText(fields.certificationsText),
    requiredFields: asStringArrayFromText(fields.requiredFieldsText),
    hasEasyApply: fields.hasEasyApply
  });
}

export function buildResumePayloadDefaultsFromJob(job: PersistedJobView): ResumePayloadDefaults {
  return {
    userId: job.userId ?? JOBS_DEMO_USER_ID,
    jobId: job.id,
    companyId: job.companyId,
    applicationPacketId: `packet_${job.id}`,
    targetRole: job.title,
    companyName: job.company?.name,
    jobDescription: job.description
  };
}

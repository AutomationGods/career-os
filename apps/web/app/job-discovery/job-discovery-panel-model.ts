export const DEFAULT_JOB_DISCOVERY_QUERY = "Splunk Cribl SIEM Terraform AWS DevOps remote";
export const DEFAULT_JOB_DISCOVERY_JOB_TITLES = [
  "Splunk Engineer",
  "Cribl Engineer",
  "SIEM Engineer",
  "Detection Engineer",
  "Security Observability Engineer",
  "DevOps Engineer"
];
export const DEFAULT_JOB_DISCOVERY_KEYWORDS = ["Splunk", "Cribl", "SIEM", "Terraform", "AWS", "observability"];
export const MAX_JOB_DISCOVERY_QUERIES = 6;
export const DEFAULT_JOB_DISCOVERY_LIMIT = 20;
export const MAX_JOB_DISCOVERY_LIMIT = 50;

export type JobDiscoverySource = "all" | "remotive" | "remoteok" | "arbeitnow";

export interface JobDiscoveryFields {
  query: string;
  jobTitles: string[] | string;
  keywords: string[] | string;
  limit: number | string;
  source: JobDiscoverySource;
}

export interface JobDiscoveryPayload {
  query: string;
  jobTitles?: string[];
  keywords?: string[];
  limit: number;
  source: JobDiscoverySource;
}

export interface JobDiscoveryJobView {
  sourceJobId: string;
  jobId: string;
  title: string;
  company: string;
  url: string;
  source: string;
  fitScore: number;
  dashboardSegment: string;
}

export interface JobDiscoveryResultView {
  commandId?: string;
  commandStatus?: string;
  runId?: string;
  source?: string;
  query?: string;
  queries: string[];
  imported: number;
  jobs: JobDiscoveryJobView[];
  errorCode?: string;
  errorMessage?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function clampJobDiscoveryLimit(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : DEFAULT_JOB_DISCOVERY_LIMIT;
  if (!Number.isFinite(parsed)) return DEFAULT_JOB_DISCOVERY_LIMIT;
  return Math.max(1, Math.min(MAX_JOB_DISCOVERY_LIMIT, Math.trunc(parsed)));
}

export function parseJobDiscoveryList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]+/) : [];
  return [...new Set(values.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))];
}

export function buildJobDiscoveryQueries(jobTitles: unknown, keywords: unknown, fallbackQuery = DEFAULT_JOB_DISCOVERY_QUERY) {
  const titles = parseJobDiscoveryList(jobTitles);
  const terms = parseJobDiscoveryList(keywords);
  const queries = titles.flatMap((title) => terms.map((keyword) => `${title} ${keyword}`.trim()));
  const deduped = [...new Set(queries.filter(Boolean))].slice(0, MAX_JOB_DISCOVERY_QUERIES);
  if (deduped.length > 0) return deduped;
  const fallback = typeof fallbackQuery === "string" && fallbackQuery.trim() ? fallbackQuery.trim() : DEFAULT_JOB_DISCOVERY_QUERY;
  return [fallback];
}

export function buildJobDiscoveryPayload(fields: Partial<JobDiscoveryFields>): JobDiscoveryPayload {
  const query = typeof fields.query === "string" && fields.query.trim() ? fields.query.trim() : DEFAULT_JOB_DISCOVERY_QUERY;
  const jobTitles = parseJobDiscoveryList(fields.jobTitles);
  const keywords = parseJobDiscoveryList(fields.keywords);
  const source = fields.source === "remotive" || fields.source === "remoteok" || fields.source === "arbeitnow" ? fields.source : "all";
  return {
    query,
    ...(jobTitles.length > 0 ? { jobTitles } : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
    limit: clampJobDiscoveryLimit(fields.limit),
    source
  };
}

function jobView(value: unknown): JobDiscoveryJobView | undefined {
  if (!isRecord(value)) return undefined;
  const sourceJobId = text(value.sourceJobId);
  const jobId = text(value.jobId);
  const title = text(value.title);
  const company = text(value.company);
  const url = text(value.url);
  if (!sourceJobId || !jobId || !title || !company || !url) return undefined;

  return {
    sourceJobId,
    jobId,
    title,
    company,
    url,
    source: text(value.source) ?? "Remotive",
    fitScore: number(value.fitScore) ?? 0,
    dashboardSegment: text(value.dashboardSegment) ?? "Low Fit"
  };
}

export function jobDiscoveryResultFromEnvelope(envelope: unknown): JobDiscoveryResultView {
  if (!isRecord(envelope)) {
    return { imported: 0, jobs: [], queries: [], errorCode: "INVALID_RESPONSE", errorMessage: "Job discovery returned an invalid response." };
  }

  if (envelope.ok === false) {
    const error = isRecord(envelope.error) ? envelope.error : {};
    return {
      imported: 0,
      jobs: [],
      queries: [],
      errorCode: text(error.code) ?? "REQUEST_FAILED",
      errorMessage: text(error.message) ?? "Job discovery failed."
    };
  }

  const data = isRecord(envelope.data) ? envelope.data : {};
  const result = isRecord(data.result) ? data.result : {};
  const jobs = Array.isArray(result.jobs) ? result.jobs.map(jobView).filter((job): job is JobDiscoveryJobView => Boolean(job)) : [];
  const queries = Array.isArray(result.queries) ? result.queries.map(text).filter((query): query is string => Boolean(query)) : text(result.query) ? [text(result.query)!] : [];

  return {
    commandId: text(data.commandId),
    commandStatus: text(data.status),
    runId: text(result.runId),
    source: text(result.source),
    query: text(result.query),
    queries,
    imported: number(result.imported) ?? jobs.length,
    jobs
  };
}

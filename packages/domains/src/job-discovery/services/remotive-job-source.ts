import type { JobPipelineInput } from "../../job-intelligence/pipeline";

export const REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs";
export const REMOTE_OK_API_URL = "https://remoteok.com/api";
export const ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api";
export const REMOTIVE_SOURCE = "Remotive";
export const REMOTE_OK_SOURCE = "Remote OK";
export const ARBEITNOW_SOURCE = "Arbeitnow";
export const DEFAULT_JOB_DISCOVERY_QUERY = "Splunk Cribl SIEM Terraform AWS DevOps remote";
export const MAX_JOB_DISCOVERY_QUERIES = 6;
export const DEFAULT_REMOTIVE_LIMIT = 20;
export const MAX_REMOTIVE_LIMIT = 50;
export const DEFAULT_REMOTIVE_TIMEOUT_MS = 10_000;
export const DEFAULT_REVIEW_PROFILE_SKILLS = ["Splunk", "Cribl", "Terraform", "AWS", "SIEM", "observability", "DevOps", "Linux"];
export const DEFAULT_REVIEW_TARGET_KEYWORDS = ["remote", "Splunk", "Cribl", "Terraform", "AWS", "observability", "SRE", "detection engineering"];

export type JobDiscoverySource = "all" | "remotive" | "remoteok" | "arbeitnow";
export type RemotiveFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface RemotiveJobRecord {
  id: number | string;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

export interface RemoteOkJobRecord {
  id: number | string;
  url?: string;
  apply_url?: string;
  position?: string;
  company?: string;
  location?: string;
  tags?: string[];
  description?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
}

export interface ArbeitnowJobRecord {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

export interface RemotiveApiResponse {
  "job-count"?: number;
  jobs: RemotiveJobRecord[];
  [key: string]: unknown;
}

export interface ArbeitnowApiResponse {
  data: ArbeitnowJobRecord[];
  [key: string]: unknown;
}

export interface DiscoveredJob {
  sourceJobId: string;
  jobId: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  url: string;
  employmentType?: string;
  source: string;
  sourceCategory?: string;
  publishedAt?: string;
  salary?: string;
  raw: unknown;
}

export type DiscoveredRemotiveJob = DiscoveredJob & { source: typeof REMOTIVE_SOURCE; raw: RemotiveJobRecord };

export interface RemotiveSearchOptions {
  query?: string;
  limit?: number;
  timeoutMs?: number;
  fetcher?: RemotiveFetch;
  source?: JobDiscoverySource;
}

export interface JobSourceSearchResult {
  source: JobDiscoverySource;
  sourceLabel: string;
  query: string;
  limit: number;
  url: string;
  jobs: DiscoveredJob[];
  raw: unknown;
}

export type RemotiveSearchResult = JobSourceSearchResult & { source: "remotive"; sourceLabel: typeof REMOTIVE_SOURCE; raw: RemotiveApiResponse; jobs: DiscoveredRemotiveJob[] };

const queryStopWords = new Set(["remote", "worldwide", "job", "jobs", "role", "roles", "and", "or", "the", "with", "for"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " "
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => namedEntities[entity.toLowerCase()] ?? match);
}

export function clampRemotiveLimit(limit: unknown, defaultLimit = DEFAULT_REMOTIVE_LIMIT) {
  const parsed = typeof limit === "number" ? limit : typeof limit === "string" ? Number.parseInt(limit, 10) : defaultLimit;
  if (!Number.isFinite(parsed)) return defaultLimit;
  return Math.max(1, Math.min(MAX_REMOTIVE_LIMIT, Math.trunc(parsed)));
}

export function cleanRemotiveHtml(html: unknown) {
  if (typeof html !== "string") return undefined;
  const cleaned = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}

export function queryKeywords(query: string) {
  return [...new Set(query.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [])]
    .filter((keyword) => keyword.length > 2 && !queryStopWords.has(keyword));
}

function normalizeQueryList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\n,]+/) : [];
  return [...new Set(values.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))];
}

export function buildJobDiscoveryQueries(options: { jobTitles?: unknown; keywords?: unknown; fallbackQuery?: string; maxQueries?: number } = {}) {
  const titles = normalizeQueryList(options.jobTitles);
  const keywords = normalizeQueryList(options.keywords);
  const maxQueries = Math.max(1, Math.trunc(options.maxQueries ?? MAX_JOB_DISCOVERY_QUERIES));
  const queries = titles.flatMap((title) => keywords.map((keyword) => `${title} ${keyword}`.trim()));
  const deduped = [...new Set(queries.filter(Boolean))].slice(0, maxQueries);
  if (deduped.length > 0) return deduped;
  const fallback = typeof options.fallbackQuery === "string" && options.fallbackQuery.trim() ? options.fallbackQuery.trim() : DEFAULT_JOB_DISCOVERY_QUERY;
  return [fallback];
}

export function dedupeDiscoveredJobs(jobs: DiscoveredJob[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    if (seen.has(job.jobId)) return false;
    seen.add(job.jobId);
    return true;
  });
}

export function jobMatchesQuery(job: DiscoveredJob, query: string) {
  const keywords = queryKeywords(query);
  if (keywords.length === 0) return true;
  const text = `${job.title} ${job.company} ${job.location ?? ""} ${job.description ?? ""} ${job.sourceCategory ?? ""}`.toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
}

function filterJobsByQuery(jobs: DiscoveredJob[], query: string, limit: number) {
  return jobs.filter((job) => jobMatchesQuery(job, query)).slice(0, clampRemotiveLimit(limit));
}

export function normalizeRemotiveJob(record: unknown): DiscoveredRemotiveJob | undefined {
  if (!isRecord(record)) return undefined;

  const sourceJobId = String(record.id ?? "").trim();
  const title = asString(record.title);
  const company = asString(record.company_name);
  const url = asString(record.url);
  if (!sourceJobId || !title || !company || !url) return undefined;

  const location = asString(record.candidate_required_location) || undefined;
  const employmentType = asString(record.job_type) || undefined;
  const sourceCategory = asString(record.category) || undefined;
  const publishedAt = asString(record.publication_date) || undefined;
  const salary = asString(record.salary) || undefined;
  const description = cleanRemotiveHtml(record.description);
  const raw = record as unknown as RemotiveJobRecord;

  return {
    sourceJobId,
    jobId: `remotive:${sourceJobId}`,
    title,
    company,
    location,
    description,
    url,
    employmentType,
    source: REMOTIVE_SOURCE,
    sourceCategory,
    publishedAt,
    salary,
    raw
  };
}

export function normalizeRemoteOkJob(record: unknown): DiscoveredJob | undefined {
  if (!isRecord(record) || !record.id) return undefined;
  const sourceJobId = String(record.id).trim();
  const title = asString(record.position);
  const company = asString(record.company);
  const url = asString(record.url) || asString(record.apply_url);
  if (!sourceJobId || !title || !company || !url) return undefined;

  const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : [];
  return {
    sourceJobId,
    jobId: `remoteok:${sourceJobId}`,
    title,
    company,
    location: asString(record.location) || "Worldwide / Remote",
    description: cleanRemotiveHtml(record.description),
    url,
    source: REMOTE_OK_SOURCE,
    sourceCategory: tags.join(", ") || undefined,
    publishedAt: asString(record.date) || undefined,
    salary: typeof record.salary_min === "number" || typeof record.salary_max === "number" ? `${record.salary_min ?? 0}-${record.salary_max ?? 0}` : undefined,
    raw: record
  };
}

export function normalizeArbeitnowJob(record: unknown): DiscoveredJob | undefined {
  if (!isRecord(record)) return undefined;
  const sourceJobId = asString(record.slug) || asString(record.url);
  const title = asString(record.title);
  const company = asString(record.company_name);
  const url = asString(record.url);
  if (!sourceJobId || !title || !company || !url) return undefined;

  const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const jobTypes = Array.isArray(record.job_types) ? record.job_types.filter((type): type is string => typeof type === "string") : [];
  return {
    sourceJobId,
    jobId: `arbeitnow:${sourceJobId}`,
    title,
    company,
    location: asString(record.location) || (record.remote === true ? "Remote / Germany" : "Germany"),
    description: cleanRemotiveHtml(record.description),
    url,
    employmentType: jobTypes.join(", ") || undefined,
    source: ARBEITNOW_SOURCE,
    sourceCategory: tags.join(", ") || undefined,
    publishedAt: typeof record.created_at === "number" ? new Date(record.created_at * 1000).toISOString() : undefined,
    raw: record
  };
}

export function validateRemotiveResponse(value: unknown): RemotiveApiResponse {
  if (!isRecord(value) || !Array.isArray(value.jobs)) {
    throw new Error("Remotive API returned an invalid response: expected a jobs array.");
  }

  return value as RemotiveApiResponse;
}

function validateRemoteOkResponse(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error("Remote OK API returned an invalid response: expected an array.");
  }
  return value;
}

function validateArbeitnowResponse(value: unknown): ArbeitnowApiResponse {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("Arbeitnow API returned an invalid response: expected a data array.");
  }
  return value as ArbeitnowApiResponse;
}

export function mapRemotiveResponse(value: unknown, limit = DEFAULT_REMOTIVE_LIMIT, query = "") {
  const response = validateRemotiveResponse(value);
  return filterJobsByQuery(response.jobs.map(normalizeRemotiveJob).filter((job): job is DiscoveredRemotiveJob => Boolean(job)), query, limit) as DiscoveredRemotiveJob[];
}

export function mapRemoteOkResponse(value: unknown, limit = DEFAULT_REMOTIVE_LIMIT, query = "") {
  const response = validateRemoteOkResponse(value);
  return filterJobsByQuery(response.map(normalizeRemoteOkJob).filter((job): job is DiscoveredJob => Boolean(job)), query, limit);
}

export function mapArbeitnowResponse(value: unknown, limit = DEFAULT_REMOTIVE_LIMIT, query = "") {
  const response = validateArbeitnowResponse(value);
  return filterJobsByQuery(response.data.map(normalizeArbeitnowJob).filter((job): job is DiscoveredJob => Boolean(job)), query, limit);
}

export function buildRemotiveSearchUrl(query: string, limit: number) {
  const url = new URL(REMOTIVE_API_URL);
  url.searchParams.set("search", query);
  url.searchParams.set("limit", String(clampRemotiveLimit(limit)));
  return url;
}

export function buildRemoteOkSearchUrl() {
  return new URL(REMOTE_OK_API_URL);
}

export function buildArbeitnowSearchUrl() {
  return new URL(ARBEITNOW_API_URL);
}

export function toJobPipelineInput(job: DiscoveredJob, userId?: string): JobPipelineInput {
  return {
    id: job.jobId,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    url: job.url,
    employmentType: job.employmentType,
    source: job.source,
    userId,
    profileSkills: DEFAULT_REVIEW_PROFILE_SKILLS,
    targetKeywords: DEFAULT_REVIEW_TARGET_KEYWORDS,
    raw: {
      ...(isRecord(job.raw) ? job.raw : {}),
      source: job.source,
      sourceJobId: job.sourceJobId,
      sourceUrl: job.url,
      sourceCategory: job.sourceCategory,
      salary: job.salary,
      publishedAt: job.publishedAt
    }
  };
}

export class RemotiveJobSearchWorker {
  constructor(private readonly fetcher: RemotiveFetch = globalThis.fetch.bind(globalThis)) {}

  async search(options: RemotiveSearchOptions = {}): Promise<JobSourceSearchResult> {
    const source = options.source ?? "all";
    if (source === "all") return this.searchAll(options);
    if (source === "remoteok") return this.searchRemoteOk(options);
    if (source === "arbeitnow") return this.searchArbeitnow(options);
    return this.searchRemotive(options);
  }

  private async fetchJson(url: URL, timeoutMs: number, headers: HeadersInit = { accept: "application/json" }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetcher(url, { signal: controller.signal, headers });
      if (!response.ok) throw new Error(`Job source request failed for ${url.hostname} with ${response.status} ${response.statusText}`.trim());
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error(`Job source request timed out after ${timeoutMs}ms for ${url.hostname}.`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async searchRemotive(options: RemotiveSearchOptions): Promise<RemotiveSearchResult> {
    const query = (options.query ?? DEFAULT_JOB_DISCOVERY_QUERY).trim() || DEFAULT_JOB_DISCOVERY_QUERY;
    const limit = clampRemotiveLimit(options.limit);
    const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_REMOTIVE_TIMEOUT_MS);
    const url = buildRemotiveSearchUrl(query, limit);
    const raw = validateRemotiveResponse(await this.fetchJson(url, timeoutMs));
    return { source: "remotive", sourceLabel: REMOTIVE_SOURCE, query, limit, url: url.toString(), jobs: mapRemotiveResponse(raw, limit, query), raw };
  }

  private async searchRemoteOk(options: RemotiveSearchOptions): Promise<JobSourceSearchResult> {
    const query = (options.query ?? DEFAULT_JOB_DISCOVERY_QUERY).trim() || DEFAULT_JOB_DISCOVERY_QUERY;
    const limit = clampRemotiveLimit(options.limit);
    const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_REMOTIVE_TIMEOUT_MS);
    const url = buildRemoteOkSearchUrl();
    const raw = validateRemoteOkResponse(await this.fetchJson(url, timeoutMs, { accept: "application/json", "user-agent": "Career OS local review" }));
    return { source: "remoteok", sourceLabel: REMOTE_OK_SOURCE, query, limit, url: url.toString(), jobs: mapRemoteOkResponse(raw, limit, query), raw };
  }

  private async searchArbeitnow(options: RemotiveSearchOptions): Promise<JobSourceSearchResult> {
    const query = (options.query ?? DEFAULT_JOB_DISCOVERY_QUERY).trim() || DEFAULT_JOB_DISCOVERY_QUERY;
    const limit = clampRemotiveLimit(options.limit);
    const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_REMOTIVE_TIMEOUT_MS);
    const url = buildArbeitnowSearchUrl();
    const raw = validateArbeitnowResponse(await this.fetchJson(url, timeoutMs));
    return { source: "arbeitnow", sourceLabel: ARBEITNOW_SOURCE, query, limit, url: url.toString(), jobs: mapArbeitnowResponse(raw, limit, query), raw };
  }

  private async searchAll(options: RemotiveSearchOptions): Promise<JobSourceSearchResult> {
    const query = (options.query ?? DEFAULT_JOB_DISCOVERY_QUERY).trim() || DEFAULT_JOB_DISCOVERY_QUERY;
    const limit = clampRemotiveLimit(options.limit);
    const settled = await Promise.allSettled([
      this.searchRemotive({ ...options, query, limit }),
      this.searchRemoteOk({ ...options, query, limit }),
      this.searchArbeitnow({ ...options, query, limit })
    ]);
    const results = settled.filter((result): result is PromiseFulfilledResult<JobSourceSearchResult> => result.status === "fulfilled").map((result) => result.value);
    const errors = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected").map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
    if (results.length === 0) throw new Error(`All public job sources failed: ${errors.join("; ")}`);
    const jobs = results.flatMap((result) => result.jobs).slice(0, limit);
    return {
      source: "all",
      sourceLabel: "All public sources",
      query,
      limit,
      url: results.map((result) => result.url).join(","),
      jobs,
      raw: {
        sources: results.map((result) => ({ source: result.source, sourceLabel: result.sourceLabel, url: result.url, raw: result.raw })),
        errors
      }
    };
  }
}

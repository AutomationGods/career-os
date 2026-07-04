import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, JobSegment, NormalizedJob } from "@career-os/shared";
import type { DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import type { ApplicationPacketRecord } from "../application-packet/services";
import type { CareerProfile } from "../career-profile/manager";
import { buildCareerCommandSourceDiagnostic, evaluateJobFit, selectCleanDiscoveryQueries, type JobSourceDiagnostic } from "../career-profile/role-taxonomy";
import { classifyRemote, normalizeJob, segmentClearance, segmentJob } from "../job-intelligence";
import { runJobPipeline } from "../job-intelligence/pipeline";
import { DEFAULT_REMOTIVE_LIMIT, RemotiveJobSearchWorker, toJobPipelineInput, type DiscoveredJob, type JobDiscoverySource, type RemotiveFetch } from "../job-discovery/services/remotive-job-source";
import { RESUME_GENERATE_COMMAND, type ResumeGenerationResult } from "../resume-factory/manager";

export const CAREER_OPPORTUNITIES_FIND_JOBS_COMMAND = "career_opportunities.find_jobs";
export const CAREER_OPPORTUNITIES_RANK_COMMAND = "career_opportunities.rank";
export const CAREER_OPPORTUNITIES_CREATE_PACKET_COMMAND = "career_opportunities.create_packet";
export const CAREER_OPPORTUNITIES_CREATE_FROM_JOB_INPUT_COMMAND = "career_opportunities.create_from_job_input";
export const CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION = "career_opportunities.current_pipeline";

export const CAREER_OPPORTUNITY_CREATED_EVENT = "career_opportunity.created";
export const CAREER_OPPORTUNITY_MANUAL_IMPORT_STARTED_EVENT = "career_opportunity.manual_import_started";
export const CAREER_OPPORTUNITY_MANUAL_IMPORTED_EVENT = "career_opportunity.manual_imported";
export const CAREER_OPPORTUNITY_MANUAL_IMPORT_FAILED_EVENT = "career_opportunity.manual_import_failed";
export const CAREER_OPPORTUNITY_SCORED_EVENT = "career_opportunity.scored";
export const CAREER_OPPORTUNITY_REJECTED_EVENT = "career_opportunity.rejected";
export const CAREER_OPPORTUNITY_PRIORITIZED_EVENT = "career_opportunity.prioritized";
export const CAREER_OPPORTUNITY_STATUS_UPDATED_EVENT = "career_opportunity.status_updated";
export const CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT = "career_opportunity.next_action_set";
export const CAREER_OPPORTUNITY_DISCOVERY_FAILED_EVENT = "career_opportunity.discovery_failed";

export interface CareerOpportunity {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  company: string;
  source: string;
  url?: string;
  applyUrl?: string;
  jobDescription: string;
  location: string;
  employmentType: string;
  remoteStatus: "remote" | "hybrid" | "onsite" | "unknown";
  requiredSkills: string[];
  preferredSkills: string[];
  clearanceRequirements: string[] | "unknown";
  certificationRequirements: string[] | "unknown";
  salaryText: string;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  risks: string[];
  applicationDifficulty: string;
  status: "discovered" | "imported" | "ranked" | "packet_needed" | "ready_to_apply" | "applied" | "follow_up_due" | "interviewing" | "rejected" | "archived" | "offer" | "packet_created" | "dismissed" | "not_fit";
  nextAction: string;
  missionPriority: number;
  fitGatePassed: boolean;
  matchedStrongKeywords: string[];
  matchedWeakKeywords: string[];
  missingRequiredContext: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  rawJob?: unknown;
}

export interface CareerOpportunitiesPipeline {
  id: string;
  workspaceId: string;
  userId: string;
  sourceQuery: string;
  sourceRunId?: string;
  sourceDiagnostics: JobSourceDiagnostic;
  searchQueriesUsed: string[];
  cleanTargetTitlesUsed: string[];
  excludedKeywords: string[];
  companiesExcludedFromSearch: string[];
  certificationsExcludedAsTitles: string[];
  certificationsUsedAsSearchKeywords: string[];
  opportunities: CareerOpportunity[];
  selectedOpportunityId?: string;
  updatedAt: string;
}

export interface FindJobsPayload {
  workspaceId?: string;
  query?: string;
  limit?: number;
  source?: JobDiscoverySource;
}

export interface RankJobsPayload {
  workspaceId?: string;
}

export interface CreatePacketPayload {
  workspaceId?: string;
  opportunityId?: string;
}

export interface CreateFromJobInputPayload {
  workspaceId?: string;
  title?: string;
  company?: string;
  source?: string;
  applyUrl?: string;
  location?: string;
  remoteStatus?: "remote" | "hybrid" | "onsite" | "unknown";
  employmentType?: string;
  salaryText?: string;
  jobDescription?: string;
  bulkText?: string;
}

export interface CareerOpportunityPacketResult {
  packet: ApplicationPacketRecord & Record<string, unknown>;
  resume: ResumeGenerationResult;
  opportunity: CareerOpportunity;
}

export const definition: DomainDefinition = {
  name: "Career Opportunities Domain",
  slug: "career-opportunities",
  manager: "CareerOpportunitiesManager",
  capabilities: ["CareerOpportunityDiscoveryCapability", "CareerOpportunityManualImportCapability", "CareerOpportunityRankingCapability", "CareerOpportunityPacketCapability"],
  workers: ["CareerOpportunityDiscoveryWorker", "CareerOpportunityManualImportWorker", "CareerOpportunityRankingWorker", "CareerOpportunityPacketWorker"],
  tools: ["RemotiveApiTool", "ManualJobInputTool", "JobIntelligencePipelineTool", "ApplicationPacketAssemblyTool", "ResumeFactoryTool"],
  commands: [CAREER_OPPORTUNITIES_FIND_JOBS_COMMAND, CAREER_OPPORTUNITIES_RANK_COMMAND, CAREER_OPPORTUNITIES_CREATE_PACKET_COMMAND, CAREER_OPPORTUNITIES_CREATE_FROM_JOB_INPUT_COMMAND],
  events: [CAREER_OPPORTUNITY_CREATED_EVENT, CAREER_OPPORTUNITY_MANUAL_IMPORT_STARTED_EVENT, CAREER_OPPORTUNITY_MANUAL_IMPORTED_EVENT, CAREER_OPPORTUNITY_MANUAL_IMPORT_FAILED_EVENT, CAREER_OPPORTUNITY_SCORED_EVENT, CAREER_OPPORTUNITY_REJECTED_EVENT, CAREER_OPPORTUNITY_PRIORITIZED_EVENT, CAREER_OPPORTUNITY_STATUS_UPDATED_EVENT, CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT, CAREER_OPPORTUNITY_DISCOVERY_FAILED_EVENT],
  permissions: ["read_jobs", "write_jobs", "generate_resume", "export_document"],
  dependencies: ["career-profile", "job-discovery", "job-intelligence", "application-packet", "resume-factory", "profile-facts", "event-store", "state-store", "snapshot-store"],
  status: "partial",
  version: "0.1.0"
};

const knownCertifications = ["cissp", "security+", "network+", "aws certified", "pmp", "cka", "ckad"];
const skillHints = ["AWS", "Azure", "GCP", "Terraform", "Kubernetes", "Docker", "Linux", "Splunk", "Cribl", "Datadog", "Python", "TypeScript", "React", "Node.js", "SQL", "DevOps", "SRE", "observability", "SIEM", "detection engineering", "incident response", "automation"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberFrom(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function nowIso() {
  return new Date().toISOString();
}

function isCareerProfile(value: unknown): value is CareerProfile {
  return isRecord(value) && Array.isArray(value.targetTitles) && Array.isArray(value.suggestedJobSearchKeywords);
}

function isPipeline(value: unknown): value is CareerOpportunitiesPipeline {
  return isRecord(value) && Array.isArray(value.opportunities);
}

function rawSalary(raw: unknown) {
  if (!isRecord(raw)) return undefined;
  const salary = stringFrom(raw.salary ?? raw.salaryText);
  return salary || undefined;
}

function wordsPresent(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return unique(words.filter((word) => lower.includes(word.toLowerCase())));
}

function extractSkills(description: string, title: string) {
  return wordsPresent(`${title} ${description}`, skillHints);
}

function searchDiagnosticsFromProfile(profile: CareerProfile | undefined) {
  const diagnostics = profile?.searchDiagnostics;
  return {
    sourceDiagnostics: buildCareerCommandSourceDiagnostic(),
    searchQueriesUsed: selectCleanDiscoveryQueries(profile),
    cleanTargetTitlesUsed: selectCleanDiscoveryQueries(profile),
    excludedKeywords: diagnostics?.excludedKeywords ?? [],
    companiesExcludedFromSearch: diagnostics?.companiesExcludedFromSearch ?? [],
    certificationsExcludedAsTitles: diagnostics?.certificationsExcludedAsTitles ?? [],
    certificationsUsedAsSearchKeywords: diagnostics?.certificationsUsedAsSearchKeywords ?? diagnostics?.certificationsKeptOutOfTitleSearch ?? []
  };
}

function extractCertifications(description: string) {
  const matches = wordsPresent(description, knownCertifications);
  return matches.length > 0 ? matches : "unknown";
}

function extractClearance(description: string) {
  const lower = description.toLowerCase();
  const requirements: string[] = [];
  if (lower.includes("public trust")) requirements.push("Public Trust");
  if (lower.includes("ts/sci")) requirements.push("TS/SCI");
  if (lower.includes("top secret")) requirements.push("Top Secret");
  if (/\bsecret\b/.test(lower) && !requirements.includes("Top Secret")) requirements.push("Secret");
  if (lower.includes("polygraph")) requirements.push("Polygraph");
  if (lower.includes("clearance") && requirements.length === 0) requirements.push("Security clearance mentioned");
  return requirements.length > 0 ? unique(requirements) : "unknown";
}

function difficultyLabel(score: number) {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  return "high";
}

function queryFromProfile(profile: CareerProfile | undefined, explicit?: string) {
  if (explicit?.trim()) return explicit.trim();
  return selectCleanDiscoveryQueries(profile).join(" ") || "Splunk Engineer SIEM Engineer";
}

function unknownIfBlank(value: unknown) {
  const text = stringFrom(value);
  return text || "unknown";
}

function optionalString(value: unknown) {
  const text = stringFrom(value);
  return text || undefined;
}

function safeRemoteStatus(value: unknown): CareerOpportunity["remoteStatus"] {
  return value === "remote" || value === "hybrid" || value === "onsite" ? value : "unknown";
}

function normalizedFromOpportunity(opportunity: CareerOpportunity): NormalizedJob {
  return normalizeJob({ title: opportunity.title, company: opportunity.company, location: opportunity.location === "unknown" ? undefined : opportunity.location, description: opportunity.jobDescription, employmentType: opportunity.employmentType === "unknown" ? undefined : opportunity.employmentType, source: opportunity.source, url: opportunity.applyUrl ?? opportunity.url, raw: opportunity.rawJob ?? {} });
}

type CareerOpportunityContext = DomainExecutionContext & { eventStore: EventStore; stateStore: StateStore; snapshotStore: SnapshotStore; dispatchCommand?: (command: CareerCommand) => Promise<CommandResult> };

async function loadProfile(context: CareerOpportunityContext, userId?: string) {
  const projection = await context.stateStore.getProjection("career_profile", userId ?? "default", "career_profile.current", userId ? { userId } : undefined);
  return isCareerProfile(projection?.data) ? projection.data : undefined;
}

async function loadPipeline(context: CareerOpportunityContext, userId?: string): Promise<CareerOpportunitiesPipeline | undefined> {
  const projection = await context.stateStore.getProjection("career_opportunities", userId ?? "default", CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION, userId ? { userId } : undefined);
  return isPipeline(projection?.data) ? projection.data : undefined;
}

async function savePipeline(context: CareerOpportunityContext, pipeline: CareerOpportunitiesPipeline, sourceEventId?: string) {
  return context.stateStore.upsertProjection({ userId: pipeline.userId, projectionType: CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION, entityType: "career_opportunities", entityId: pipeline.userId, sourceEventId, data: pipeline, updatedAt: new Date(pipeline.updatedAt) });
}

function opportunityFromManualInput(input: { payload: CreateFromJobInputPayload; userId: string; workspaceId: string; sequence?: number }): CareerOpportunity {
  const description = unknownIfBlank(input.payload.jobDescription ?? input.payload.bulkText);
  const title = unknownIfBlank(input.payload.title) === "unknown" ? "Manual pasted job batch for review" : unknownIfBlank(input.payload.title);
  const fit = evaluateJobFit({ title, description });
  const requiredSkills = extractSkills(description, title);
  const matchedSkills = fit.passed ? unique([...fit.matchedStrongKeywords, ...fit.matchedWeakKeywords]) : fit.matchedStrongKeywords;
  const missingSkills = fit.passed ? unique(requiredSkills.filter((skill) => !matchedSkills.some((matched) => matched.toLowerCase() === skill.toLowerCase()))) : unique(["role mismatch", ...fit.missingRequiredContext]);
  const clearanceRequirements = extractClearance(description);
  const certificationRequirements = extractCertifications(description);
  const risks = unique([
    ...fit.risks,
    clearanceRequirements === "unknown" ? undefined : "clearance_or_public_trust_requirement_found",
    certificationRequirements === "unknown" ? undefined : "certification_requirement_found"
  ].filter((value): value is string => Boolean(value)));
  const now = nowIso();
  const source = unknownIfBlank(input.payload.source) === "unknown" ? "Manual Job Import" : unknownIfBlank(input.payload.source);
  const applyUrl = optionalString(input.payload.applyUrl);
  return {
    id: `manual:${Date.now()}:${input.sequence ?? 0}:${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    userId: input.userId,
    title,
    company: unknownIfBlank(input.payload.company),
    source,
    url: applyUrl,
    applyUrl,
    jobDescription: description,
    location: unknownIfBlank(input.payload.location),
    employmentType: unknownIfBlank(input.payload.employmentType),
    remoteStatus: safeRemoteStatus(input.payload.remoteStatus),
    requiredSkills,
    preferredSkills: unique([...fit.matchedStrongKeywords, ...fit.matchedWeakKeywords].filter((keyword) => !requiredSkills.some((skill) => skill.toLowerCase() === keyword.toLowerCase())).slice(0, 12)),
    clearanceRequirements,
    certificationRequirements,
    salaryText: unknownIfBlank(input.payload.salaryText),
    fitScore: fit.passed ? fit.score : 0,
    matchedSkills,
    missingSkills,
    risks,
    applicationDifficulty: fit.passed ? difficultyLabel(40) : "not_applicable",
    status: fit.passed ? "imported" : "not_fit",
    nextAction: fit.passed ? "Create packet and manually apply outside Career OS." : "Rejected: not a realistic target role from the current Career Profile",
    missionPriority: fit.passed ? fit.score - risks.length * 10 : -100,
    fitGatePassed: fit.passed,
    matchedStrongKeywords: fit.matchedStrongKeywords,
    matchedWeakKeywords: fit.matchedWeakKeywords,
    missingRequiredContext: fit.missingRequiredContext,
    rejectionReason: fit.rejectionReason,
    createdAt: now,
    updatedAt: now,
    rawJob: { manualInput: true, source, applyUrl }
  };
}

function labeledValue(text: string, label: string) {
  const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
}

function chunkHasExplicitJobLabels(chunk: string) {
  return Boolean(labeledValue(chunk, "title") && labeledValue(chunk, "company"));
}

function manualPayloadsFromInput(payload: CreateFromJobInputPayload): CreateFromJobInputPayload[] {
  const bulkText = stringFrom(payload.bulkText);
  if (!bulkText || stringFrom(payload.title) || stringFrom(payload.jobDescription)) return [payload];
  const chunks = bulkText.split(/\n\s*(?:---|###)\s*\n|\n{3,}/).map((chunk) => chunk.trim()).filter(Boolean);
  if (chunks.length < 2 || !chunks.every(chunkHasExplicitJobLabels)) return [{ ...payload, title: "Manual pasted job batch for review", jobDescription: bulkText }];
  return chunks.map((chunk) => ({
    ...payload,
    title: labeledValue(chunk, "title"),
    company: labeledValue(chunk, "company"),
    source: labeledValue(chunk, "source") ?? payload.source,
    applyUrl: labeledValue(chunk, "apply url") ?? labeledValue(chunk, "url") ?? payload.applyUrl,
    location: labeledValue(chunk, "location") ?? payload.location,
    employmentType: labeledValue(chunk, "employment type") ?? payload.employmentType,
    salaryText: labeledValue(chunk, "salary") ?? labeledValue(chunk, "salary text") ?? payload.salaryText,
    jobDescription: labeledValue(chunk, "description") ?? chunk,
    bulkText: undefined
  }));
}

function opportunityFromJob(input: { job: DiscoveredJob; userId: string; workspaceId: string; profile: CareerProfile | undefined; fitScore?: number; applicationDifficultyScore?: number }): CareerOpportunity {
  const description = input.job.description ?? "";
  const fit = evaluateJobFit({ title: input.job.title, description });
  const requiredSkills = extractSkills(description, input.job.title);
  const matchedSkills = fit.passed ? unique([...fit.matchedStrongKeywords, ...fit.matchedWeakKeywords]) : fit.matchedStrongKeywords;
  const missingSkills = fit.passed ? unique(requiredSkills.filter((skill) => !matchedSkills.some((matched) => matched.toLowerCase() === skill.toLowerCase()))) : unique(["role mismatch", ...fit.missingRequiredContext]);
  const clearanceRequirements = extractClearance(description);
  const certificationRequirements = extractCertifications(description);
  const risks = unique([
    ...fit.risks,
    clearanceRequirements === "unknown" ? undefined : "clearance_or_public_trust_requirement_found",
    certificationRequirements === "unknown" ? undefined : "certification_requirement_found"
  ].filter((value): value is string => Boolean(value)));
  const now = nowIso();
  return {
    id: input.job.jobId || `${input.job.source}:${input.job.sourceJobId}`,
    workspaceId: input.workspaceId,
    userId: input.userId,
    title: input.job.title,
    company: input.job.company,
    source: input.job.source,
    url: input.job.url,
    applyUrl: input.job.url,
    jobDescription: description || "unknown",
    location: input.job.location ?? "unknown",
    employmentType: input.job.employmentType ?? "unknown",
    remoteStatus: classifyRemote(normalizeJob({ ...input.job, source: input.job.source, raw: input.job.raw })),
    requiredSkills,
    preferredSkills: unique([...fit.matchedStrongKeywords, ...fit.matchedWeakKeywords].filter((keyword) => !requiredSkills.some((skill) => skill.toLowerCase() === keyword.toLowerCase())).slice(0, 12)),
    clearanceRequirements,
    certificationRequirements,
    salaryText: rawSalary(input.job.raw) ?? input.job.salary ?? "unknown",
    fitScore: fit.passed ? fit.score : 0,
    matchedSkills,
    missingSkills,
    risks,
    applicationDifficulty: fit.passed ? difficultyLabel(numberFrom(input.applicationDifficultyScore, 40)) : "not_applicable",
    status: fit.passed ? "discovered" : "not_fit",
    nextAction: fit.passed ? "Create packet and manually apply today" : "Rejected: not a realistic target role from the current Career Profile",
    missionPriority: fit.passed ? fit.score - risks.length * 10 : -100,
    fitGatePassed: fit.passed,
    matchedStrongKeywords: fit.matchedStrongKeywords,
    matchedWeakKeywords: fit.matchedWeakKeywords,
    missingRequiredContext: fit.missingRequiredContext,
    rejectionReason: fit.rejectionReason,
    createdAt: now,
    updatedAt: now,
    rawJob: input.job.raw
  };
}

export class CareerOpportunitiesManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "CareerOpportunityDiscoveryCapability",
      workers: ["CareerOpportunityDiscoveryWorker"],
      commands: [CAREER_OPPORTUNITIES_FIND_JOBS_COMMAND],
      events: [CAREER_OPPORTUNITY_CREATED_EVENT, CAREER_OPPORTUNITY_DISCOVERY_FAILED_EVENT],
      permissions: ["read_jobs"]
    },
    {
      name: "CareerOpportunityManualImportCapability",
      workers: ["CareerOpportunityManualImportWorker"],
      commands: [CAREER_OPPORTUNITIES_CREATE_FROM_JOB_INPUT_COMMAND],
      events: [CAREER_OPPORTUNITY_MANUAL_IMPORT_STARTED_EVENT, CAREER_OPPORTUNITY_MANUAL_IMPORTED_EVENT, CAREER_OPPORTUNITY_MANUAL_IMPORT_FAILED_EVENT, CAREER_OPPORTUNITY_SCORED_EVENT, CAREER_OPPORTUNITY_REJECTED_EVENT, CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT],
      permissions: ["write_jobs"]
    },
    {
      name: "CareerOpportunityRankingCapability",
      workers: ["CareerOpportunityRankingWorker"],
      commands: [CAREER_OPPORTUNITIES_RANK_COMMAND],
      events: [CAREER_OPPORTUNITY_SCORED_EVENT, CAREER_OPPORTUNITY_PRIORITIZED_EVENT, CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT],
      permissions: ["read_jobs"]
    },
    {
      name: "CareerOpportunityPacketCapability",
      workers: ["CareerOpportunityPacketWorker"],
      commands: [CAREER_OPPORTUNITIES_CREATE_PACKET_COMMAND],
      events: [CAREER_OPPORTUNITY_STATUS_UPDATED_EVENT],
      permissions: ["generate_resume", "export_document"]
    }
  ];

  private readonly worker: RemotiveJobSearchWorker;

  constructor(options: { worker?: RemotiveJobSearchWorker; fetcher?: RemotiveFetch } = {}) {
    this.worker = options.worker ?? new RemotiveJobSearchWorker(options.fetcher);
  }

  canHandle(command: CareerCommand) {
    return [CAREER_OPPORTUNITIES_FIND_JOBS_COMMAND, CAREER_OPPORTUNITIES_RANK_COMMAND, CAREER_OPPORTUNITIES_CREATE_PACKET_COMMAND, CAREER_OPPORTUNITIES_CREATE_FROM_JOB_INPUT_COMMAND].includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const executionContext = context as CareerOpportunityContext;
    if (command.type === CAREER_OPPORTUNITIES_FIND_JOBS_COMMAND) return this.handleFindJobs(command as CareerCommand<FindJobsPayload>, executionContext);
    if (command.type === CAREER_OPPORTUNITIES_CREATE_FROM_JOB_INPUT_COMMAND) return this.handleCreateFromJobInput(command as CareerCommand<CreateFromJobInputPayload>, executionContext);
    if (command.type === CAREER_OPPORTUNITIES_RANK_COMMAND) return this.handleRankJobs(command as CareerCommand<RankJobsPayload>, executionContext);
    if (command.type === CAREER_OPPORTUNITIES_CREATE_PACKET_COMMAND) return this.handleCreatePacket(command as CareerCommand<CreatePacketPayload>, executionContext);
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleFindJobs(command: CareerCommand<FindJobsPayload>, context: CareerOpportunityContext): Promise<CommandResult<CareerOpportunitiesPipeline>> {
    const userId = command.userId;
    const entityId = userId ?? "default";
    try {
      if (!userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Finding jobs requires a userId." } };
      const profile = await loadProfile(context, userId);
      const queryDiagnostics = searchDiagnosticsFromProfile(profile);
      const query = queryFromProfile(profile, command.payload?.query);
      const limit = typeof command.payload?.limit === "number" ? command.payload.limit : Math.min(DEFAULT_REMOTIVE_LIMIT, 10);
      const source = command.payload?.source ?? "all";
      const runId = `career_job_discovery_run_${Date.now()}`;
      await context.eventStore.append({ eventType: "job.discovery_started", entityType: "job_discovery_run", entityId: runId, domain: "job-discovery", manager: "Job Discovery Manager", capability: "PublicJobSearchCapability", worker: "RemotiveJobSearchWorker", userId, payload: { commandId: command.id, query, source, limit, initiatedBy: this.domainSlug }, confidence: 1 });
      const search = await this.worker.search({ query, limit, source });
      await context.snapshotStore.captureSnapshot({ userId, entityType: "job_discovery_run", entityId: runId, snapshotType: "job.discovery_source_response", source: search.sourceLabel, data: { query, source, limit, raw: search.raw } });
      const opportunities: CareerOpportunity[] = [];
      const profileSkills = unique([...(profile?.strongestSkills ?? []), ...(profile?.strongestTools ?? [])]);
      for (const job of search.jobs) {
        const pipeline = await runJobPipeline({ ...toJobPipelineInput(job, userId), profileSkills, targetKeywords: profile?.suggestedJobSearchKeywords }, { eventStore: context.eventStore, stateStore: context.stateStore, snapshotStore: context.snapshotStore });
        const opportunity = opportunityFromJob({ job, userId, workspaceId: command.payload?.workspaceId ?? "default", profile, fitScore: pipeline.fitScore, applicationDifficultyScore: pipeline.applicationDifficultyScore });
        opportunities.push(opportunity);
        await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_CREATED_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityDiscoveryCapability", worker: "CareerOpportunityDiscoveryWorker", userId, payload: opportunity, evidence: { source: job.source, jobDiscoveryRunId: runId }, confidence: 1 });
      }
      const completed = await context.eventStore.append({ eventType: "job.discovery_completed", entityType: "job_discovery_run", entityId: runId, domain: "job-discovery", manager: "Job Discovery Manager", capability: "PublicJobSearchCapability", worker: "RemotiveJobSearchWorker", userId, payload: { commandId: command.id, runId, query, imported: opportunities.length, source }, evidence: { source: search.sourceLabel, sourceUrl: search.url, selectedSource: source, attributionRequired: true }, confidence: 1 });
      await context.stateStore.upsertProjection({ userId, projectionType: "job.discovery_run", entityType: "job_discovery_run", entityId: runId, sourceEventId: completed.id, data: { runId, source, query, imported: opportunities.length, jobs: opportunities, status: "completed", sourceUrl: search.url, sourceLabel: search.sourceLabel, attributionRequired: true }, updatedAt: new Date() });
      const pipeline: CareerOpportunitiesPipeline = { id: `career_opportunities_${userId}`, workspaceId: command.payload?.workspaceId ?? "default", userId, sourceQuery: query, sourceRunId: runId, ...queryDiagnostics, opportunities, updatedAt: nowIso() };
      await savePipeline(context, pipeline, completed.id);
      return { ok: true, status: "completed", commandId: command.id, data: pipeline, emittedEvents: [CAREER_OPPORTUNITY_CREATED_EVENT, "job.discovery_started", "job.discovery_completed"], updatedProjections: [CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION, "job.discovery_run", "job.dashboard_segment"] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown career opportunity discovery failure";
      await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_DISCOVERY_FAILED_EVENT, entityType: "career_opportunities", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityDiscoveryCapability", worker: "CareerOpportunityDiscoveryWorker", userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "CAREER_OPPORTUNITY_DISCOVERY_FAILED", message }, emittedEvents: [CAREER_OPPORTUNITY_DISCOVERY_FAILED_EVENT], updatedProjections: [CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION] };
    }
  }

  private async handleCreateFromJobInput(command: CareerCommand<CreateFromJobInputPayload>, context: CareerOpportunityContext): Promise<CommandResult<CareerOpportunitiesPipeline>> {
    const userId = command.userId;
    const entityId = userId ?? "default";
    try {
      if (!userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Manual job import requires a userId." } };
      const payloads = manualPayloadsFromInput(command.payload ?? {});
      if (payloads.length === 0 || payloads.every((payload) => !stringFrom(payload.title) && !stringFrom(payload.jobDescription) && !stringFrom(payload.bulkText))) {
        return { ok: false, status: "rejected", commandId: command.id, error: { code: "JOB_INPUT_REQUIRED", message: "Paste a job title and description, or a bulk job paste." } };
      }

      const started = await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_MANUAL_IMPORT_STARTED_EVENT, entityType: "career_opportunities", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityManualImportCapability", worker: "CareerOpportunityManualImportWorker", userId, payload: { commandId: command.id, count: payloads.length }, confidence: 1 });
      const profile = await loadProfile(context, userId);
      const diagnostics = searchDiagnosticsFromProfile(profile);
      const existing = await loadPipeline(context, userId);
      const imported = payloads.map((payload, index) => opportunityFromManualInput({ payload, userId, workspaceId: payload.workspaceId ?? command.payload?.workspaceId ?? existing?.workspaceId ?? "default", sequence: index }));
      let lastEventId = started.id;

      for (const opportunity of imported) {
        const importedEvent = await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_MANUAL_IMPORTED_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityManualImportCapability", worker: "CareerOpportunityManualImportWorker", userId, payload: opportunity, evidence: { source: opportunity.source, applyUrl: opportunity.applyUrl }, confidence: 1 });
        lastEventId = importedEvent.id;
        await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_SCORED_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityManualImportCapability", worker: "CareerOpportunityManualImportWorker", userId, payload: { commandId: command.id, fitScore: opportunity.fitScore, matchedSkills: opportunity.matchedSkills, missingSkills: opportunity.missingSkills, risks: opportunity.risks }, confidence: 1 });
        if (opportunity.status === "not_fit") await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_REJECTED_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityManualImportCapability", worker: "CareerOpportunityManualImportWorker", userId, payload: { commandId: command.id, rejectionReason: opportunity.rejectionReason, missingRequiredContext: opportunity.missingRequiredContext }, confidence: 1 });
        await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityManualImportCapability", worker: "CareerOpportunityManualImportWorker", userId, payload: { commandId: command.id, nextAction: opportunity.nextAction }, confidence: 1 });
      }

      const opportunities = [...imported, ...(existing?.opportunities ?? [])].sort((a, b) => b.missionPriority - a.missionPriority || b.fitScore - a.fitScore);
      const pipeline: CareerOpportunitiesPipeline = {
        id: existing?.id ?? `career_opportunities_${userId}`,
        workspaceId: command.payload?.workspaceId ?? existing?.workspaceId ?? "default",
        userId,
        sourceQuery: existing?.sourceQuery ?? queryFromProfile(profile),
        sourceRunId: existing?.sourceRunId,
        ...diagnostics,
        opportunities,
        selectedOpportunityId: imported.find((opportunity) => opportunity.fitGatePassed)?.id ?? existing?.selectedOpportunityId,
        updatedAt: nowIso()
      };
      await savePipeline(context, pipeline, lastEventId);
      return { ok: true, status: "completed", commandId: command.id, data: pipeline, emittedEvents: [CAREER_OPPORTUNITY_MANUAL_IMPORT_STARTED_EVENT, CAREER_OPPORTUNITY_MANUAL_IMPORTED_EVENT, CAREER_OPPORTUNITY_SCORED_EVENT, CAREER_OPPORTUNITY_REJECTED_EVENT, CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT], updatedProjections: [CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown manual job import failure";
      await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_MANUAL_IMPORT_FAILED_EVENT, entityType: "career_opportunities", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityManualImportCapability", worker: "CareerOpportunityManualImportWorker", userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "CAREER_OPPORTUNITY_MANUAL_IMPORT_FAILED", message }, emittedEvents: [CAREER_OPPORTUNITY_MANUAL_IMPORT_FAILED_EVENT], updatedProjections: [CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION] };
    }
  }

  private async handleRankJobs(command: CareerCommand<RankJobsPayload>, context: CareerOpportunityContext): Promise<CommandResult<CareerOpportunitiesPipeline>> {
    const userId = command.userId;
    if (!userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Ranking jobs requires a userId." } };
    const profile = await loadProfile(context, userId);
    const existing = await loadPipeline(context, userId);
    if (!existing || existing.opportunities.length === 0) return { ok: false, status: "rejected", commandId: command.id, error: { code: "NO_DISCOVERED_OPPORTUNITIES", message: "Run Find Jobs before ranking." } };

    const ranked = existing.opportunities.map((opportunity) => {
      const fit = evaluateJobFit({ title: opportunity.title, description: opportunity.jobDescription });
      const requiredSkills = extractSkills(opportunity.jobDescription, opportunity.title);
      const matchedSkills = fit.passed ? unique([...fit.matchedStrongKeywords, ...fit.matchedWeakKeywords]) : fit.matchedStrongKeywords;
      const missingSkills = fit.passed ? unique(requiredSkills.filter((skill) => !matchedSkills.some((matched) => matched.toLowerCase() === skill.toLowerCase()))) : unique(["role mismatch", ...fit.missingRequiredContext]);
      const risks = unique([
        ...fit.risks,
        ...(opportunity.clearanceRequirements === "unknown" ? [] : ["clearance_or_public_trust_requirement_found"]),
        ...(opportunity.certificationRequirements === "unknown" ? [] : ["certification_requirement_found"])
      ]);
      return {
        ...opportunity,
        fitScore: fit.passed ? fit.score : 0,
        matchedSkills,
        missingSkills,
        risks,
        status: fit.status,
        nextAction: fit.passed ? (fit.score >= 50 && risks.length === 0 ? "Create packet now; manually apply today" : "Review risk flags, then create packet") : "Rejected: role mismatch or low relevance for the current Career Profile",
        missionPriority: fit.passed ? fit.score - risks.length * 10 : -100,
        fitGatePassed: fit.passed,
        matchedStrongKeywords: fit.matchedStrongKeywords,
        matchedWeakKeywords: fit.matchedWeakKeywords,
        missingRequiredContext: fit.missingRequiredContext,
        rejectionReason: fit.rejectionReason,
        updatedAt: nowIso()
      };
    }).sort((a, b) => b.missionPriority - a.missionPriority || b.fitScore - a.fitScore);

    let lastEventId: string | undefined;
    for (const opportunity of ranked) {
      const scored = await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_SCORED_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityRankingCapability", worker: "CareerOpportunityRankingWorker", userId, payload: { commandId: command.id, fitScore: opportunity.fitScore, matchedSkills: opportunity.matchedSkills, missingSkills: opportunity.missingSkills, risks: opportunity.risks }, confidence: 1 });
      lastEventId = scored.id;
      await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityRankingCapability", worker: "CareerOpportunityRankingWorker", userId, payload: { commandId: command.id, nextAction: opportunity.nextAction }, confidence: 1 });
    }
    const prioritized = await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_PRIORITIZED_EVENT, entityType: "career_opportunities", entityId: userId, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityRankingCapability", worker: "CareerOpportunityRankingWorker", userId, payload: { commandId: command.id, opportunityIds: ranked.map((job) => job.id) }, confidence: 1 });
    const pipeline = { ...existing, opportunities: ranked, updatedAt: nowIso() };
    await savePipeline(context, pipeline, prioritized.id ?? lastEventId);
    return { ok: true, status: "completed", commandId: command.id, data: pipeline, emittedEvents: [CAREER_OPPORTUNITY_SCORED_EVENT, CAREER_OPPORTUNITY_NEXT_ACTION_SET_EVENT, CAREER_OPPORTUNITY_PRIORITIZED_EVENT], updatedProjections: [CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION] };
  }

  private async handleCreatePacket(command: CareerCommand<CreatePacketPayload>, context: CareerOpportunityContext): Promise<CommandResult<CareerOpportunityPacketResult>> {
    const userId = command.userId;
    if (!userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Packet creation requires a userId." } };
    const pipeline = await loadPipeline(context, userId);
    const requestedOpportunityId = command.payload?.opportunityId;
    const blockedPacketStatuses = new Set(["not_fit", "rejected", "archived", "dismissed"]);
    const opportunity = requestedOpportunityId ? pipeline?.opportunities.find((item) => item.id === requestedOpportunityId) : pipeline?.opportunities.find((item) => !blockedPacketStatuses.has(item.status) && item.fitGatePassed !== false);
    if (!pipeline || !opportunity) return { ok: false, status: "rejected", commandId: command.id, error: { code: "OPPORTUNITY_NOT_FOUND", message: "Select a ranked job before creating a packet." } };
    if (blockedPacketStatuses.has(opportunity.status) || opportunity.fitGatePassed === false) return { ok: false, status: "rejected", commandId: command.id, error: { code: "OPPORTUNITY_NOT_FIT", message: "Rejected/not-fit jobs cannot be used to create an application packet." } };

    const dispatchCommand = context.dispatchCommand;
    if (!dispatchCommand) return { ok: false, status: "failed", commandId: command.id, error: { code: "COMMAND_DISPATCH_UNAVAILABLE", message: "Orchestrator dispatch is required to create packets from opportunities." } };

    const selectedJob = normalizedFromOpportunity(opportunity);
    const segment = segmentClearance(selectedJob) ?? segmentJob(selectedJob) as JobSegment;
    const companyId = `company_${opportunity.company.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown"}`;
    const packetCreateResult = await dispatchCommand({
      id: `command_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type: "application_packets.create",
      requestedBy: "worker",
      userId,
      entityType: "application_packet",
      entityId: opportunity.id,
      payload: {
        jobId: opportunity.id,
        companyId,
        selectedJob,
        selectedCompany: { name: opportunity.company },
        fitScoreSummary: { score: opportunity.fitScore, segment, highlights: opportunity.matchedSkills.slice(0, 6) },
        notes: ["Created by Career Command. No external submit, upload, or email was performed."]
      },
      createdAt: new Date().toISOString()
    });

    if (!packetCreateResult.ok || !packetCreateResult.data) {
      return { ok: false, status: "failed", commandId: command.id, error: packetCreateResult.error ?? { code: "APPLICATION_PACKET_CREATE_FAILED", message: "Application Packet Domain failed while creating the packet." }, emittedEvents: packetCreateResult.emittedEvents, updatedProjections: packetCreateResult.updatedProjections };
    }

    const packet = packetCreateResult.data as ApplicationPacketRecord;
    const resumeResult = await dispatchCommand({
      id: `command_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type: RESUME_GENERATE_COMMAND,
      requestedBy: "worker",
      userId,
      entityType: "application_packet",
      entityId: packet.id,
      payload: {
        jobId: opportunity.id,
        companyId: packet.companyId ?? opportunity.company,
        applicationPacketId: packet.id,
        targetRole: opportunity.title,
        companyName: opportunity.company,
        jobDescription: opportunity.jobDescription === "unknown" ? undefined : opportunity.jobDescription,
        targetKeywords: opportunity.matchedSkills
      },
      createdAt: new Date().toISOString()
    });

    if (!resumeResult.ok || !resumeResult.data) {
      return { ok: false, status: "failed", commandId: command.id, error: resumeResult.error ?? { code: "RESUME_GENERATION_FAILED", message: "Resume Factory failed while creating the packet." }, emittedEvents: [...(packetCreateResult.emittedEvents ?? []), ...(resumeResult.emittedEvents ?? [])], updatedProjections: [...(packetCreateResult.updatedProjections ?? []), ...(resumeResult.updatedProjections ?? [])] };
    }

    const statusResult = await dispatchCommand({
      id: `command_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type: "application_packets.update_status",
      requestedBy: "worker",
      userId,
      entityType: "application_packet",
      entityId: packet.id,
      payload: { id: packet.id, status: "awaiting_review", note: "Resume draft generated from resume-allowed Profile Facts only." },
      createdAt: new Date().toISOString()
    });
    if (!statusResult.ok || !statusResult.data) {
      return { ok: false, status: "failed", commandId: command.id, error: statusResult.error ?? { code: "APPLICATION_PACKET_STATUS_UPDATE_FAILED", message: "Application Packet Domain failed while updating packet status." }, emittedEvents: [...(packetCreateResult.emittedEvents ?? []), ...(resumeResult.emittedEvents ?? []), ...(statusResult.emittedEvents ?? [])], updatedProjections: [...(packetCreateResult.updatedProjections ?? []), ...(resumeResult.updatedProjections ?? []), ...(statusResult.updatedProjections ?? [])] };
    }

    const resume = resumeResult.data as ResumeGenerationResult;
    const statusPacket = statusResult.data as ApplicationPacketRecord;
    const enrichedPacket: ApplicationPacketRecord & Record<string, unknown> = {
      ...statusPacket,
      nextAction: "Review grounded resume draft, fill missing evidence, then apply manually outside Career OS.",
      resumeDraft: resume.draft,
      truthfulnessSummary: resume.truthfulnessSummary,
      blockedClaims: resume.blockedFactIds,
      missingEvidence: resume.truthfulnessSummary.missingRequiredFacts,
      needsEvidenceFactIds: resume.needsEvidenceFactIds,
      updatedAt: nowIso()
    };
    const updatedEvent = await context.eventStore.append({ eventType: CAREER_OPPORTUNITY_STATUS_UPDATED_EVENT, entityType: "career_opportunity", entityId: opportunity.id, domain: this.domainSlug, manager: definition.manager, capability: "CareerOpportunityPacketCapability", worker: "CareerOpportunityPacketWorker", userId, payload: { commandId: command.id, status: "packet_created", packetId: packet.id }, confidence: 1 });
    await context.stateStore.upsertProjection({ userId, projectionType: "application_packet.current", entityType: "application_packet", entityId: packet.id, sourceEventId: updatedEvent.id, data: enrichedPacket, updatedAt: new Date(enrichedPacket.updatedAt) });
    const updatedOpportunities = pipeline.opportunities.map((item) => item.id === opportunity.id ? { ...item, status: "packet_created" as const, nextAction: "Review packet and apply manually.", updatedAt: nowIso() } : item);
    await savePipeline(context, { ...pipeline, selectedOpportunityId: opportunity.id, opportunities: updatedOpportunities, updatedAt: nowIso() }, updatedEvent.id);
    return { ok: true, status: "completed", commandId: command.id, data: { packet: enrichedPacket, resume, opportunity }, emittedEvents: [...(packetCreateResult.emittedEvents ?? []), ...(resumeResult.emittedEvents ?? []), ...(statusResult.emittedEvents ?? []), CAREER_OPPORTUNITY_STATUS_UPDATED_EVENT], updatedProjections: ["application_packet.current", "resume.current_draft", CAREER_OPPORTUNITIES_CURRENT_PIPELINE_PROJECTION] };
  }
}

import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { runJobPipeline } from "../job-intelligence/pipeline";
import {
  clampRemotiveLimit,
  DEFAULT_JOB_DISCOVERY_QUERY,
  RemotiveJobSearchWorker,
  toJobPipelineInput,
  type DiscoveredJob,
  type JobDiscoverySource,
  type JobSourceSearchResult,
  type RemotiveFetch
} from "./services/remotive-job-source";

export const JOB_DISCOVERY_SEARCH_COMMAND = "job_discovery.search";

export interface JobDiscoverySearchPayload {
  query?: string;
  limit?: number;
  source?: JobDiscoverySource;
}

export interface JobDiscoverySearchJobResult {
  sourceJobId: string;
  jobId: string;
  title: string;
  company: string;
  url: string;
  source: string;
  fitScore: number;
  dashboardSegment: string;
}

export interface JobDiscoverySearchResult {
  runId: string;
  source: JobDiscoverySource;
  query: string;
  imported: number;
  jobs: JobDiscoverySearchJobResult[];
}

export interface JobDiscoveryExecutionContext extends DomainExecutionContext {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
}

export const definition: DomainDefinition = {
  name: "Job Discovery Domain",
  slug: "job-discovery",
  manager: "Job Discovery Manager",
  capabilities: ["PublicJobSearchCapability"],
  workers: ["RemotiveJobSearchWorker"],
  tools: ["RemotiveApiTool"],
  commands: [JOB_DISCOVERY_SEARCH_COMMAND],
  events: ["job.discovery_started", "job.discovery_completed", "job.discovery_failed"],
  permissions: ["read_jobs"],
  dependencies: ["event-store", "state-store", "snapshot-store", "job-intelligence", "public-job-apis"],
  status: "partial",
  version: "0.2.0"
};

function buildRunId(command: CareerCommand) {
  return command.entityId ?? `job_discovery_run_${Date.now()}`;
}

function parsePayload(payload: unknown): Required<JobDiscoverySearchPayload> {
  const record = Boolean(payload) && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  const source = record.source === undefined ? "all" : record.source;
  if (source !== "all" && source !== "remotive" && source !== "remoteok" && source !== "arbeitnow") {
    throw new Error("Unsupported job source. Choose all, remotive, remoteok, or arbeitnow.");
  }

  const query = typeof record.query === "string" && record.query.trim() ? record.query.trim() : DEFAULT_JOB_DISCOVERY_QUERY;
  const limit = clampRemotiveLimit(record.limit);
  return { query, limit, source };
}

function toResultJob(job: DiscoveredJob, pipelineResult: Awaited<ReturnType<typeof runJobPipeline>>): JobDiscoverySearchJobResult {
  return {
    sourceJobId: job.sourceJobId,
    jobId: pipelineResult.jobId,
    title: job.title,
    company: job.company,
    url: job.url,
    source: job.source,
    fitScore: pipelineResult.fitScore,
    dashboardSegment: pipelineResult.dashboardSegment
  };
}

export class JobDiscoveryManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "PublicJobSearchCapability",
      description: "Finds public remote jobs through selected public job APIs without submitting applications or contacting anyone.",
      workers: ["RemotiveJobSearchWorker"],
      commands: [JOB_DISCOVERY_SEARCH_COMMAND],
      events: ["job.discovery_started", "job.discovery_completed", "job.discovery_failed"],
      permissions: ["read_jobs"]
    }
  ];

  private readonly worker: RemotiveJobSearchWorker;

  constructor(options: { worker?: RemotiveJobSearchWorker; fetcher?: RemotiveFetch } = {}) {
    this.worker = options.worker ?? new RemotiveJobSearchWorker(options.fetcher);
  }

  canHandle(command: CareerCommand) {
    return command.type === JOB_DISCOVERY_SEARCH_COMMAND;
  }

  async handle(command: CareerCommand<JobDiscoverySearchPayload>, context: DomainExecutionContext): Promise<CommandResult<JobDiscoverySearchResult>> {
    if (!this.canHandle(command)) {
      return {
        ok: false,
        status: "rejected",
        commandId: command.id,
        error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` }
      };
    }

    const executionContext = context as JobDiscoveryExecutionContext;
    const runId = buildRunId(command);

    try {
      const payload = parsePayload(command.payload);
      const startedEvent = await executionContext.eventStore.append({
        eventType: "job.discovery_started",
        entityType: "job_discovery_run",
        entityId: runId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "PublicJobSearchCapability",
        worker: "RemotiveJobSearchWorker",
        userId: command.userId,
        payload: { commandId: command.id, source: payload.source, query: payload.query, limit: payload.limit },
        confidence: 1
      });

      await executionContext.stateStore.upsertProjection({
        userId: command.userId,
        projectionType: "job.discovery_run",
        entityType: "job_discovery_run",
        entityId: runId,
        sourceEventId: startedEvent.id,
        data: { runId, source: payload.source, query: payload.query, limit: payload.limit, status: "running", imported: 0 },
        updatedAt: new Date()
      });

      const searchResult = await this.worker.search({ query: payload.query, limit: payload.limit, source: payload.source });
      await this.captureSearchSnapshot(executionContext, command, runId, searchResult);

      const jobs: JobDiscoverySearchJobResult[] = [];
      const emittedEvents = ["job.discovery_started"];
      for (const job of searchResult.jobs) {
        const pipelineResult = await runJobPipeline(toJobPipelineInput(job, command.userId), {
          eventStore: executionContext.eventStore,
          stateStore: executionContext.stateStore,
          snapshotStore: executionContext.snapshotStore
        });
        jobs.push(toResultJob(job, pipelineResult));
        emittedEvents.push(...pipelineResult.eventsEmitted);
      }

      const result: JobDiscoverySearchResult = {
        runId,
        source: payload.source,
        query: searchResult.query,
        imported: jobs.length,
        jobs
      };

      const completedEvent = await executionContext.eventStore.append({
        eventType: "job.discovery_completed",
        entityType: "job_discovery_run",
        entityId: runId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "PublicJobSearchCapability",
        worker: "RemotiveJobSearchWorker",
        userId: command.userId,
        payload: { commandId: command.id, ...result },
        evidence: { source: searchResult.sourceLabel, sourceUrl: searchResult.url, attributionRequired: true, selectedSource: payload.source },
        confidence: 1
      });

      await executionContext.stateStore.upsertProjection({
        userId: command.userId,
        projectionType: "job.discovery_run",
        entityType: "job_discovery_run",
        entityId: runId,
        sourceEventId: completedEvent.id,
        data: { ...result, status: "completed", sourceUrl: searchResult.url, sourceLabel: searchResult.sourceLabel, attributionRequired: true },
        updatedAt: new Date()
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: result,
        emittedEvents: [...emittedEvents, "job.discovery_completed"],
        updatedProjections: ["job.discovery_run", "job.dashboard_segment"]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown job discovery failure";
      const failedEvent = await executionContext.eventStore.append({
        eventType: "job.discovery_failed",
        entityType: "job_discovery_run",
        entityId: runId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "PublicJobSearchCapability",
        worker: "RemotiveJobSearchWorker",
        userId: command.userId,
        payload: { commandId: command.id, message },
        confidence: 1
      });

      await executionContext.stateStore.upsertProjection({
        userId: command.userId,
        projectionType: "job.discovery_run",
        entityType: "job_discovery_run",
        entityId: runId,
        sourceEventId: failedEvent.id,
        data: { runId, status: "failed", message },
        updatedAt: new Date()
      });

      return {
        ok: false,
        status: "failed",
        commandId: command.id,
        error: { code: "JOB_DISCOVERY_FAILED", message },
        emittedEvents: ["job.discovery_failed"],
        updatedProjections: ["job.discovery_run"]
      };
    }
  }

  private async captureSearchSnapshot(context: JobDiscoveryExecutionContext, command: CareerCommand, runId: string, searchResult: JobSourceSearchResult) {
    await context.snapshotStore.captureSnapshot({
      userId: command.userId,
      entityType: "job_discovery_run",
      entityId: runId,
      snapshotType: "job.discovery_source_response",
      source: searchResult.sourceLabel,
      data: {
        commandId: command.id,
        source: searchResult.sourceLabel,
        sourceUrl: searchResult.url,
        query: searchResult.query,
        limit: searchResult.limit,
        response: searchResult.raw
      }
    });
  }
}

import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { runJobPipeline } from "../job-intelligence/pipeline";
import { createDeterministicJobId, prismaJobStore, type JobStore, type JobStoreListFilter, type ManualJobImportInput } from "./job-store";

export const JOB_IMPORT_MANUAL_URL_COMMAND = "jobs.import_manual_url";
export const JOB_LIST_COMMAND = "jobs.list";
export const JOB_GET_COMMAND = "jobs.get";
export const JOB_IMPORTED_EVENT = "job.imported";
export const JOB_SOURCE_SNAPSHOT_CAPTURED_EVENT = "job.source_snapshot_captured";
export const JOB_PERSISTED_EVENT = "job.persisted";
export const JOB_CURRENT_PROJECTION = "job.current";
export const JOB_PIPELINE_RESULT_PROJECTION = "job.pipeline_result";
export const JOB_MANUAL_SOURCE_SNAPSHOT = "job.manual_source";

export const definition: DomainDefinition = {
  name: "Job Discovery Domain",
  slug: "job-discovery",
  manager: "Job Discovery Manager",
  capabilities: ["ManualJobImportCapability"],
  workers: ["ManualJobImportWorker"],
  tools: ["ManualJobStoreTool"],
  commands: [JOB_IMPORT_MANUAL_URL_COMMAND, JOB_LIST_COMMAND, JOB_GET_COMMAND],
  events: [JOB_IMPORTED_EVENT, JOB_SOURCE_SNAPSHOT_CAPTURED_EVENT, JOB_PERSISTED_EVENT],
  permissions: ["write_jobs", "read_jobs"],
  dependencies: ["event-store", "state-store", "snapshot-store", "job-intelligence"],
  status: "implemented",
  version: "1.0.0"
};

type JobDiscoveryContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
  jobStore?: JobStore;
};

type ManualJobImportPayload = Partial<ManualJobImportInput> & Record<string, unknown>;

type JobGetPayload = {
  id?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringFrom(value: unknown) {
  const valueString = stringFrom(value);
  return valueString || undefined;
}

function stringArrayFrom(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function booleanFrom(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function validationError(command: CareerCommand, code: string, message: string): CommandResult {
  return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
}

function buildManualImportInput(command: CareerCommand): ManualJobImportInput | CommandResult {
  if (!isRecord(command.payload)) return validationError(command, "JOB_IMPORT_PAYLOAD_REQUIRED", "Manual job import requires an object payload.");
  const payload = command.payload as ManualJobImportPayload;
  const title = stringFrom(payload.title);
  const companyName = optionalStringFrom(payload.companyName ?? payload.company);
  const description = stringFrom(payload.description);

  if (!title) return validationError(command, "JOB_TITLE_REQUIRED", "Manual job import requires a pasted title.");
  if (!companyName) return validationError(command, "JOB_COMPANY_REQUIRED", "Manual job import requires a pasted company name.");
  if (!description) return validationError(command, "JOB_DESCRIPTION_REQUIRED", "Manual job import requires a pasted job description.");

  const input: ManualJobImportInput = {
    id: optionalStringFrom(payload.id ?? payload.jobId ?? command.entityId),
    jobId: optionalStringFrom(payload.jobId ?? payload.id ?? command.entityId),
    userId: optionalStringFrom(payload.userId ?? command.userId),
    url: optionalStringFrom(payload.url),
    title,
    companyName,
    company: companyName,
    companyId: optionalStringFrom(payload.companyId),
    location: optionalStringFrom(payload.location),
    description,
    employmentType: optionalStringFrom(payload.employmentType),
    source: optionalStringFrom(payload.source) ?? "manual",
    certifications: stringArrayFrom(payload.certifications),
    requiredFields: stringArrayFrom(payload.requiredFields),
    hasEasyApply: booleanFrom(payload.hasEasyApply),
    status: optionalStringFrom(payload.status)
  };
  const jobId = input.jobId ?? input.id ?? createDeterministicJobId(input);
  return { ...input, id: jobId, jobId };
}

function isCommandResult(value: ManualJobImportInput | CommandResult): value is CommandResult {
  return "ok" in value && "status" in value && "commandId" in value;
}

function buildListFilter(command: CareerCommand): JobStoreListFilter {
  const payload = isRecord(command.payload) ? command.payload : {};
  return {
    userId: optionalStringFrom(payload.userId ?? command.userId),
    segment: optionalStringFrom(payload.segment),
    status: optionalStringFrom(payload.status),
    limit: numberFrom(payload.limit)
  };
}

function getJobId(command: CareerCommand<JobGetPayload>) {
  return stringFrom(command.entityId ?? command.payload?.id);
}

export class JobDiscoveryManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "ManualJobImportCapability",
      workers: ["ManualJobImportWorker"],
      commands: [JOB_IMPORT_MANUAL_URL_COMMAND, JOB_LIST_COMMAND, JOB_GET_COMMAND],
      events: [JOB_IMPORTED_EVENT, JOB_SOURCE_SNAPSHOT_CAPTURED_EVENT, JOB_PERSISTED_EVENT],
      permissions: ["write_jobs", "read_jobs"]
    }
  ];

  canHandle(command: CareerCommand) {
    return [JOB_IMPORT_MANUAL_URL_COMMAND, JOB_LIST_COMMAND, JOB_GET_COMMAND].includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    if (!this.canHandle(command)) return validationError(command, "COMMAND_NOT_SUPPORTED", `${this.domainName} cannot handle ${command.type}`);
    const executionContext = context as JobDiscoveryContext;
    const jobStore = executionContext.jobStore ?? prismaJobStore;

    if (command.type === JOB_LIST_COMMAND) {
      const jobs = await jobStore.list(buildListFilter(command));
      return { ok: true, status: "completed", commandId: command.id, data: { jobs }, updatedProjections: [] };
    }

    if (command.type === JOB_GET_COMMAND) {
      const id = getJobId(command as CareerCommand<JobGetPayload>);
      if (!id) return validationError(command, "JOB_ID_REQUIRED", "jobs.get requires a job id.");
      const payload = command.payload as (Partial<JobGetPayload> & { userId?: unknown }) | undefined;
      const userId = optionalStringFrom(command.userId ?? payload?.userId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "jobs.get requires an authenticated user id.");
      const job = await jobStore.getById(id, userId);
      if (!job) return validationError(command, "JOB_NOT_FOUND", `Job not found: ${id}`);
      return { ok: true, status: "completed", commandId: command.id, data: { job }, updatedProjections: [] };
    }

    const importInputOrError = buildManualImportInput(command);
    if (isCommandResult(importInputOrError)) return importInputOrError;
    const importInput = importInputOrError;
    const jobId = importInput.jobId ?? importInput.id ?? createDeterministicJobId(importInput);

    const importedEvent = await executionContext.eventStore.append({
      eventType: JOB_IMPORTED_EVENT,
      entityType: "job",
      entityId: jobId,
      domain: definition.slug,
      manager: definition.manager,
      capability: "ManualJobImportCapability",
      worker: "ManualJobImportWorker",
      userId: importInput.userId,
      payload: { jobId, userId: importInput.userId, title: importInput.title, company: importInput.companyName ?? importInput.company, url: importInput.url, externalActionTaken: false },
      evidence: { source: importInput.source ?? "manual", url: importInput.url, manualOnly: true },
      confidence: 1
    });

    const sourceSnapshot = await executionContext.snapshotStore.captureSnapshot({
      userId: importInput.userId,
      entityType: "job",
      entityId: jobId,
      snapshotType: JOB_MANUAL_SOURCE_SNAPSHOT,
      source: JOB_MANUAL_SOURCE_SNAPSHOT,
      data: { commandId: command.id, importedEventId: importedEvent.id, input: importInput, externalActionTaken: false }
    });

    const snapshotEvent = await executionContext.eventStore.append({
      eventType: JOB_SOURCE_SNAPSHOT_CAPTURED_EVENT,
      entityType: "job",
      entityId: jobId,
      domain: definition.slug,
      manager: definition.manager,
      capability: "ManualJobImportCapability",
      worker: "ManualJobImportWorker",
      userId: importInput.userId,
      payload: { jobId, sourceSnapshotId: sourceSnapshot.id, snapshotType: JOB_MANUAL_SOURCE_SNAPSHOT },
      evidence: { importedEventId: importedEvent.id, manualOnly: true },
      confidence: 1
    });

    const pipelineResult = await runJobPipeline(
      {
        ...importInput,
        id: jobId,
        company: importInput.companyName ?? importInput.company,
        source: importInput.source ?? "manual",
        userId: importInput.userId
      },
      {
        eventStore: executionContext.eventStore,
        stateStore: executionContext.stateStore,
        snapshotStore: executionContext.snapshotStore,
        jobStore
      }
    );
    const job = pipelineResult.persistedJob ?? await jobStore.getById(jobId, importInput.userId);

    await executionContext.stateStore.upsertProjection({
      userId: importInput.userId,
      projectionType: JOB_CURRENT_PROJECTION,
      entityType: "job",
      entityId: jobId,
      sourceEventId: snapshotEvent.id,
      data: { job, jobId, sourceSnapshotId: sourceSnapshot.id, pipelineSourceSnapshotId: pipelineResult.sourceSnapshotId, externalActionTaken: false, updatedBy: JOB_IMPORT_MANUAL_URL_COMMAND },
      updatedAt: new Date()
    });

    await executionContext.stateStore.upsertProjection({
      userId: importInput.userId,
      projectionType: JOB_PIPELINE_RESULT_PROJECTION,
      entityType: "job",
      entityId: jobId,
      sourceEventId: snapshotEvent.id,
      data: { jobId, sourceSnapshotId: sourceSnapshot.id, pipelineSourceSnapshotId: pipelineResult.sourceSnapshotId, pipelineResult, persistedJobId: job?.id, externalActionTaken: false, updatedBy: JOB_IMPORT_MANUAL_URL_COMMAND },
      updatedAt: new Date()
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { job, pipelineResult, sourceSnapshotId: sourceSnapshot.id, externalActionTaken: false },
      emittedEvents: [JOB_IMPORTED_EVENT, JOB_SOURCE_SNAPSHOT_CAPTURED_EVENT, ...pipelineResult.eventsEmitted],
      updatedProjections: [JOB_CURRENT_PROJECTION, JOB_PIPELINE_RESULT_PROJECTION, "job.dashboard_segment"]
    };
  }
}

import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import type { JobStore } from "../job-discovery/job-store";
import { runJobPipeline, type JobPipelineInput } from "./pipeline";

export const definition: DomainDefinition = {
  name: "Job Intelligence Domain",
  slug: "job-intelligence",
  manager: "Job Intelligence Manager",
  capabilities: ["JobPipelineCapability"],
  workers: ["JobPipelineWorker"],
  tools: ["JobClassificationTool"],
  commands: ["jobs.run_pipeline"],
  events: ["job.pipeline_completed"],
  permissions: [],
  dependencies: ["event-store", "state-store", "job-normalization", "remote-classification", "clearance-segmentation", "fit-scoring", "application-difficulty", "certification-intelligence"],
  status: "partial",
  version: "0.2.0"
};

export interface JobPipelineExecutionContext {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
  jobStore?: JobStore;
}

function needsPersistedJobHydration(input: JobPipelineInput) {
  return !input.title || !input.company || !input.description;
}

async function hydratePersistedPipelineInput(input: JobPipelineInput, jobStore?: JobStore): Promise<JobPipelineInput> {
  if (!jobStore || !input.id || !needsPersistedJobHydration(input)) return input;
  const job = await jobStore.getById(input.id);
  if (!job) return input;
  return {
    ...input,
    title: input.title ?? job.title,
    company: input.company ?? job.company?.name ?? job.latestPipelineResult?.normalizedJob.company,
    companyId: input.companyId ?? job.companyId,
    location: input.location ?? job.location,
    description: input.description ?? job.description,
    url: input.url ?? job.url,
    employmentType: input.employmentType ?? job.employmentType,
    certifications: input.certifications ?? job.certifications.map((certification) => certification.certification),
    source: input.source ?? job.source ?? "persisted"
  };
}

export class JobIntelligenceManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "JobPipelineCapability",
      workers: ["JobPipelineWorker"],
      commands: ["jobs.run_pipeline"],
      events: ["job.pipeline_completed"],
      permissions: []
    }
  ];

  canHandle(command: CareerCommand) {
    return command.type === "jobs.run_pipeline";
  }

  async handle(command: CareerCommand<JobPipelineInput>, context: DomainExecutionContext): Promise<CommandResult> {
    if (!this.canHandle(command)) {
      return {
        ok: false,
        status: "rejected",
        commandId: command.id,
        error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` }
      };
    }

    const executionContext = context as unknown as JobPipelineExecutionContext;
    const pipelineInput = await hydratePersistedPipelineInput(
      { ...command.payload, id: command.entityId ?? command.payload.id, userId: command.userId ?? command.payload.userId },
      executionContext.jobStore
    );
    const result = await runJobPipeline(
      pipelineInput,
      { eventStore: executionContext.eventStore, stateStore: executionContext.stateStore, snapshotStore: executionContext.snapshotStore, jobStore: executionContext.jobStore }
    );

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: result,
      emittedEvents: result.eventsEmitted,
      updatedProjections: ["job.dashboard_segment", "job.pipeline_result"]
    };
  }
}

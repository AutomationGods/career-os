import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
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
    const result = await runJobPipeline(
      { ...command.payload, id: command.entityId ?? command.payload.id, userId: command.userId ?? command.payload.userId },
      { eventStore: executionContext.eventStore, stateStore: executionContext.stateStore, snapshotStore: executionContext.snapshotStore }
    );

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: result,
      emittedEvents: result.eventsEmitted,
      updatedProjections: ["job.dashboard_segment"]
    };
  }
}

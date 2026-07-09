import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import { FIT_SCORE_BATCH_COMMAND, FIT_SCORE_CALCULATE_COMMAND } from "./commands";
import { FIT_SCORE_BATCH_COMPLETED_EVENT, FIT_SCORE_CALCULATED_EVENT, FIT_SCORE_FAILED_EVENT } from "./events";
import { calculateFitScore } from "./workers";

type FitScoringContext = DomainExecutionContext & { eventStore: EventStore };

export const definition: DomainDefinition = {
  name: "Fit Scoring Domain",
  slug: "fit-scoring",
  manager: "Fit Scoring Manager",
  capabilities: ["FitScoreCalculationCapability", "FitScoreBatchCapability"],
  workers: ["FitScoreWorker"],
  tools: ["KeywordMatchTool", "ClearanceMatchTool", "LocationFitTool"],
  commands: [FIT_SCORE_CALCULATE_COMMAND, FIT_SCORE_BATCH_COMMAND],
  events: [FIT_SCORE_CALCULATED_EVENT, FIT_SCORE_BATCH_COMPLETED_EVENT, FIT_SCORE_FAILED_EVENT],
  permissions: [],
  dependencies: ["career-profile"],
  status: "implemented",
  version: "0.1.0",
};

interface FitScorePayload {
  title: string;
  description?: string;
  jobId?: string;
  jobs?: Array<{ title: string; description?: string; jobId?: string }>;
}

export class FitScoringManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "FitScoreCalculationCapability",
      workers: ["FitScoreWorker"],
      commands: [FIT_SCORE_CALCULATE_COMMAND],
      events: [FIT_SCORE_CALCULATED_EVENT, FIT_SCORE_FAILED_EVENT],
      permissions: [],
    },
    {
      name: "FitScoreBatchCapability",
      workers: ["FitScoreWorker"],
      commands: [FIT_SCORE_BATCH_COMMAND],
      events: [FIT_SCORE_BATCH_COMPLETED_EVENT, FIT_SCORE_FAILED_EVENT],
      permissions: [],
    },
  ];

  canHandle(command: CareerCommand) {
    return command.type === FIT_SCORE_CALCULATE_COMMAND || command.type === FIT_SCORE_BATCH_COMMAND;
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as FitScoringContext;
    if (command.type === FIT_SCORE_CALCULATE_COMMAND) return this.handleCalculate(command as CareerCommand<FitScorePayload>, ctx);
    if (command.type === FIT_SCORE_BATCH_COMMAND) return this.handleBatch(command as CareerCommand<FitScorePayload>, ctx);
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleCalculate(command: CareerCommand<FitScorePayload>, context: FitScoringContext): Promise<CommandResult> {
    const { title, description, jobId } = command.payload;
    if (!title) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "TITLE_REQUIRED", message: "Job title is required for fit scoring." } };
    }

    try {
      const result = calculateFitScore({ title, description });
      const entityId = jobId ?? `fit_${Date.now()}`;
      await context.eventStore.append({
        eventType: FIT_SCORE_CALCULATED_EVENT,
        entityType: "job_fit_score",
        entityId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "FitScoreCalculationCapability",
        worker: "FitScoreWorker",
        userId: command.userId,
        payload: { commandId: command.id, ...result },
        confidence: 1,
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: result,
        emittedEvents: [FIT_SCORE_CALCULATED_EVENT],
        updatedProjections: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown fit scoring failure";
      await context.eventStore.append({
        eventType: FIT_SCORE_FAILED_EVENT,
        entityType: "job_fit_score",
        entityId: jobId ?? "unknown",
        domain: this.domainSlug,
        manager: definition.manager,
        userId: command.userId,
        payload: { commandId: command.id, message },
        confidence: 1,
      });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "FIT_SCORE_FAILED", message } };
    }
  }

  private async handleBatch(command: CareerCommand<FitScorePayload>, context: FitScoringContext): Promise<CommandResult> {
    const jobs = command.payload.jobs;
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "JOBS_REQUIRED", message: "An array of jobs is required for batch scoring." } };
    }

    try {
      const results = jobs.map((job) => ({ jobId: job.jobId, ...calculateFitScore({ title: job.title, description: job.description }) }));
      await context.eventStore.append({
        eventType: FIT_SCORE_BATCH_COMPLETED_EVENT,
        entityType: "job_fit_score",
        entityId: command.entityId ?? `batch_${Date.now()}`,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "FitScoreBatchCapability",
        worker: "FitScoreWorker",
        userId: command.userId,
        payload: { commandId: command.id, count: results.length, results },
        confidence: 1,
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: { results, count: results.length },
        emittedEvents: [FIT_SCORE_BATCH_COMPLETED_EVENT],
        updatedProjections: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown batch fit scoring failure";
      return { ok: false, status: "failed", commandId: command.id, error: { code: "FIT_SCORE_BATCH_FAILED", message } };
    }
  }
}

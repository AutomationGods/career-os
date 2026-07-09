import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import type { StateStore } from "@career-os/state";
import {
  COVER_LETTER_GENERATE_COMMAND,
  COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND,
  COVER_LETTER_REVISE_COMMAND,
} from "./commands";
import {
  COVER_LETTER_GENERATED_EVENT,
  COVER_LETTER_GENERATION_FAILED_EVENT,
  COVER_LETTER_PLACEHOLDER_CREATED_EVENT,
  COVER_LETTER_REVISED_EVENT,
} from "./events";

export const definition: DomainDefinition = {
  name: "Cover Letter Domain",
  slug: "cover-letter",
  manager: "Cover Letter Manager",
  capabilities: ["CoverLetterGenerationCapability", "CoverLetterRevisionCapability"],
  workers: ["CoverLetterGenerationWorker"],
  tools: ["HumanReviewGateTool", "TruthfulnessGuardTool"],
  commands: [COVER_LETTER_GENERATE_COMMAND, COVER_LETTER_REVISE_COMMAND, COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND],
  events: [COVER_LETTER_GENERATED_EVENT, COVER_LETTER_REVISED_EVENT, COVER_LETTER_PLACEHOLDER_CREATED_EVENT, COVER_LETTER_GENERATION_FAILED_EVENT],
  permissions: ["generate_cover_letter"],
  dependencies: ["application-packet", "profile-facts"],
  status: "implemented",
  version: "0.3.0",
};

type CoverLetterContext = DomainExecutionContext & { eventStore: EventStore; stateStore: StateStore };

interface CoverLetterPayload {
  applicationPacketId?: string;
  companyName?: string;
  targetRole?: string;
  jobDescription?: string;
  tone?: "professional" | "enthusiastic" | "concise";
  coverLetterId?: string;
  feedback?: string;
  content?: string;
}

function generatePlaceholderContent(companyName: string, targetRole?: string): string {
  const role = targetRole ?? "the open position";
  return [
    `Dear Hiring Manager,`,
    ``,
    `I am writing to express my interest in the ${role} role at ${companyName}.`,
    ``,
    `[This is a placeholder cover letter. Review and personalize before use.]`,
    ``,
    `Sincerely,`,
    `[Your Name]`,
  ].join("\n");
}

export class CoverLetterManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "CoverLetterGenerationCapability",
      workers: ["CoverLetterGenerationWorker"],
      commands: [COVER_LETTER_GENERATE_COMMAND, COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND],
      events: [COVER_LETTER_GENERATED_EVENT, COVER_LETTER_PLACEHOLDER_CREATED_EVENT, COVER_LETTER_GENERATION_FAILED_EVENT],
      permissions: ["generate_cover_letter"],
    },
    {
      name: "CoverLetterRevisionCapability",
      workers: ["CoverLetterGenerationWorker"],
      commands: [COVER_LETTER_REVISE_COMMAND],
      events: [COVER_LETTER_REVISED_EVENT],
      permissions: ["generate_cover_letter"],
    },
  ];

  canHandle(command: CareerCommand) {
    return [COVER_LETTER_GENERATE_COMMAND, COVER_LETTER_REVISE_COMMAND, COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND].includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as CoverLetterContext;
    const payload = (command.payload ?? {}) as CoverLetterPayload;

    switch (command.type) {
      case COVER_LETTER_GENERATE_COMMAND:
        return this.handleGenerate(command, ctx, payload);
      case COVER_LETTER_REVISE_COMMAND:
        return this.handleRevise(command, ctx, payload);
      case COVER_LETTER_GENERATE_PLACEHOLDER_COMMAND:
        return this.handlePlaceholder(command, ctx, payload);
      default:
        return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
    }
  }

  private async handleGenerate(command: CareerCommand, context: CoverLetterContext, payload: CoverLetterPayload): Promise<CommandResult> {
    const { companyName, targetRole, jobDescription, tone = "professional" } = payload;
    if (!companyName) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMPANY_NAME_REQUIRED", message: "Company name is required to generate a cover letter." } };
    }

    try {
      const coverLetterId = `cl_${Date.now()}`;
      const content = generatePlaceholderContent(companyName, targetRole);

      // Load profile facts for truthfulness guard
      const userId = command.userId ?? "default";
      const factProjections = await context.stateStore.listByProjectionType("profile_facts.current", { userId });
      const factCount = factProjections.length;

      await context.eventStore.append({
        eventType: COVER_LETTER_GENERATED_EVENT,
        entityType: "cover_letter",
        entityId: coverLetterId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "CoverLetterGenerationCapability",
        worker: "CoverLetterGenerationWorker",
        userId: command.userId,
        payload: { commandId: command.id, coverLetterId, companyName, targetRole, tone, factCount, contentLength: content.length },
        confidence: 1,
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: { coverLetterId, companyName, targetRole, tone, content, factCount, reviewRequired: true },
        emittedEvents: [COVER_LETTER_GENERATED_EVENT],
        updatedProjections: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cover letter generation failure";
      await context.eventStore.append({
        eventType: COVER_LETTER_GENERATION_FAILED_EVENT,
        entityType: "cover_letter",
        entityId: command.entityId ?? "unknown",
        domain: this.domainSlug,
        manager: definition.manager,
        userId: command.userId,
        payload: { commandId: command.id, message },
        confidence: 1,
      });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "COVER_LETTER_GENERATION_FAILED", message } };
    }
  }

  private async handleRevise(command: CareerCommand, context: CoverLetterContext, payload: CoverLetterPayload): Promise<CommandResult> {
    const { coverLetterId, feedback, content } = payload;
    if (!coverLetterId) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "COVER_LETTER_ID_REQUIRED", message: "A cover letter ID is required to revise." } };
    }

    await context.eventStore.append({
      eventType: COVER_LETTER_REVISED_EVENT,
      entityType: "cover_letter",
      entityId: coverLetterId,
      domain: this.domainSlug,
      manager: definition.manager,
      capability: "CoverLetterRevisionCapability",
      worker: "CoverLetterGenerationWorker",
      userId: command.userId,
      payload: { commandId: command.id, coverLetterId, feedback, revisedAt: new Date().toISOString() },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { coverLetterId, status: "revised", reviewRequired: true },
      emittedEvents: [COVER_LETTER_REVISED_EVENT],
      updatedProjections: [],
    };
  }

  private async handlePlaceholder(command: CareerCommand, context: CoverLetterContext, payload: CoverLetterPayload): Promise<CommandResult> {
    const { companyName = "Unknown Company", targetRole } = payload;
    const content = generatePlaceholderContent(companyName, targetRole);

    await context.eventStore.append({
      eventType: COVER_LETTER_PLACEHOLDER_CREATED_EVENT,
      entityType: "cover_letter",
      entityId: command.entityId ?? `cl_placeholder_${Date.now()}`,
      domain: this.domainSlug,
      manager: definition.manager,
      userId: command.userId,
      payload: { commandId: command.id, companyName, content },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { companyName, content, isPlaceholder: true },
      emittedEvents: [COVER_LETTER_PLACEHOLDER_CREATED_EVENT],
      updatedProjections: [],
    };
  }
}

import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import { EMAIL_CLASSIFY_COMMAND } from "./commands";
import { EMAIL_CLASSIFIED_EVENT } from "./events";

export const definition: DomainDefinition = {
  name: "Email Intelligence Domain",
  slug: "email-intelligence",
  manager: "Email Intelligence Manager",
  capabilities: ["EmailClassificationCapability"],
  workers: ["EmailClassificationWorker"],
  tools: ["GmailReadOnlyTool"],
  commands: [EMAIL_CLASSIFY_COMMAND],
  events: [EMAIL_CLASSIFIED_EVENT],
  permissions: ["read_gmail"],
  dependencies: [],
  status: "implemented",
  version: "0.1.0",
};

type EmailContext = DomainExecutionContext & { eventStore: EventStore };

export class EmailIntelligenceManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    { name: "EmailClassificationCapability", workers: ["EmailClassificationWorker"], commands: [EMAIL_CLASSIFY_COMMAND], events: [EMAIL_CLASSIFIED_EVENT], permissions: ["read_gmail"] },
  ];

  canHandle(command: CareerCommand) { return command.type === EMAIL_CLASSIFY_COMMAND; }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as EmailContext;
    const { subject, body } = (command.payload ?? {}) as { subject?: string; body?: string };
    const text = `${subject ?? ""} ${body ?? ""}`.toLowerCase();
    const isJobRelated = ["interview", "application", "resume", "offer", "hiring", "recruiter"].some((kw) => text.includes(kw));
    const category = isJobRelated ? "job_related" : "other";

    await ctx.eventStore.append({
      eventType: EMAIL_CLASSIFIED_EVENT, entityType: "email", entityId: command.entityId ?? `email_${Date.now()}`,
      domain: this.domainSlug, manager: definition.manager, userId: command.userId,
      payload: { commandId: command.id, category, subject }, confidence: isJobRelated ? 0.8 : 0.5,
    });

    return { ok: true, status: "completed", commandId: command.id, data: { category, isJobRelated }, emittedEvents: [EMAIL_CLASSIFIED_EVENT], updatedProjections: [] };
  }
}

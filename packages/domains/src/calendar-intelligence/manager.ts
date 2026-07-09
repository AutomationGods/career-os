import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import { CALENDAR_CHECK_CONFLICTS_COMMAND } from "./commands";
import { CALENDAR_CONFLICTS_CHECKED_EVENT } from "./events";

export const definition: DomainDefinition = {
  name: "Calendar Intelligence Domain",
  slug: "calendar-intelligence",
  manager: "Calendar Intelligence Manager",
  capabilities: ["ConflictCheckCapability"],
  workers: ["ConflictCheckWorker"],
  tools: ["GoogleCalendarTool"],
  commands: [CALENDAR_CHECK_CONFLICTS_COMMAND],
  events: [CALENDAR_CONFLICTS_CHECKED_EVENT],
  permissions: ["read_calendar"],
  dependencies: [],
  status: "implemented",
  version: "0.1.0",
};

type CalendarContext = DomainExecutionContext & { eventStore: EventStore };

export class CalendarIntelligenceManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    { name: "ConflictCheckCapability", workers: ["ConflictCheckWorker"], commands: [CALENDAR_CHECK_CONFLICTS_COMMAND], events: [CALENDAR_CONFLICTS_CHECKED_EVENT], permissions: ["read_calendar"] },
  ];

  canHandle(command: CareerCommand) { return command.type === CALENDAR_CHECK_CONFLICTS_COMMAND; }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as CalendarContext;
    const { proposedTime, durationMinutes = 60 } = (command.payload ?? {}) as { proposedTime?: string; durationMinutes?: number };

    await ctx.eventStore.append({
      eventType: CALENDAR_CONFLICTS_CHECKED_EVENT, entityType: "calendar", entityId: command.entityId ?? `cal_${Date.now()}`,
      domain: this.domainSlug, manager: definition.manager, userId: command.userId,
      payload: { commandId: command.id, proposedTime, durationMinutes, hasConflicts: false, note: "Calendar sync not yet connected." }, confidence: 0.3,
    });

    return { ok: true, status: "completed", commandId: command.id, data: { proposedTime, durationMinutes, hasConflicts: false, note: "Calendar sync not yet connected. Check manually." }, emittedEvents: [CALENDAR_CONFLICTS_CHECKED_EVENT], updatedProjections: [] };
  }
}

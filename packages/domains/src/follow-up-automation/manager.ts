import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import {
  FOLLOWUP_CANCEL_COMMAND,
  FOLLOWUP_EXECUTE_COMMAND,
  FOLLOWUP_SCHEDULE_COMMAND,
  FOLLOWUP_SNOOZE_COMMAND,
} from "./commands";
import {
  FOLLOWUP_CANCELLED_EVENT,
  FOLLOWUP_EXECUTED_EVENT,
  FOLLOWUP_FAILED_EVENT,
  FOLLOWUP_SCHEDULED_EVENT,
  FOLLOWUP_SNOOZED_EVENT,
} from "./events";

export const definition: DomainDefinition = {
  name: "Follow-Up Automation Domain",
  slug: "follow-up-automation",
  manager: "Follow-Up Automation Manager",
  capabilities: ["FollowupSchedulingCapability", "FollowupExecutionCapability"],
  workers: ["FollowupSchedulingWorker", "FollowupReminderWorker"],
  tools: ["FollowupSchedulingTool"],
  commands: [FOLLOWUP_SCHEDULE_COMMAND, FOLLOWUP_EXECUTE_COMMAND, FOLLOWUP_SNOOZE_COMMAND, FOLLOWUP_CANCEL_COMMAND],
  events: [FOLLOWUP_SCHEDULED_EVENT, FOLLOWUP_EXECUTED_EVENT, FOLLOWUP_SNOOZED_EVENT, FOLLOWUP_CANCELLED_EVENT, FOLLOWUP_FAILED_EVENT],
  permissions: ["create_followup", "schedule_followup"],
  dependencies: ["relationship-intelligence"],
  status: "implemented",
  version: "0.1.0",
};

type FollowupContext = DomainExecutionContext & { eventStore: EventStore };

interface FollowupPayload {
  followupId?: string;
  personId?: string;
  applicationId?: string;
  dueAt?: string;
  note?: string;
  snoozeHours?: number;
}

export class FollowUpAutomationManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "FollowupSchedulingCapability",
      workers: ["FollowupSchedulingWorker"],
      commands: [FOLLOWUP_SCHEDULE_COMMAND, FOLLOWUP_SNOOZE_COMMAND, FOLLOWUP_CANCEL_COMMAND],
      events: [FOLLOWUP_SCHEDULED_EVENT, FOLLOWUP_SNOOZED_EVENT, FOLLOWUP_CANCELLED_EVENT],
      permissions: ["create_followup", "schedule_followup"],
    },
    {
      name: "FollowupExecutionCapability",
      workers: ["FollowupReminderWorker"],
      commands: [FOLLOWUP_EXECUTE_COMMAND],
      events: [FOLLOWUP_EXECUTED_EVENT],
      permissions: [],
    },
  ];

  canHandle(command: CareerCommand) {
    return [FOLLOWUP_SCHEDULE_COMMAND, FOLLOWUP_EXECUTE_COMMAND, FOLLOWUP_SNOOZE_COMMAND, FOLLOWUP_CANCEL_COMMAND].includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as FollowupContext;
    const payload = (command.payload ?? {}) as FollowupPayload;

    switch (command.type) {
      case FOLLOWUP_SCHEDULE_COMMAND:
        return this.handleSchedule(command, ctx, payload);
      case FOLLOWUP_EXECUTE_COMMAND:
        return this.handleExecute(command, ctx, payload);
      case FOLLOWUP_SNOOZE_COMMAND:
        return this.handleSnooze(command, ctx, payload);
      case FOLLOWUP_CANCEL_COMMAND:
        return this.handleCancel(command, ctx, payload);
      default:
        return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
    }
  }

  private async handleSchedule(command: CareerCommand, context: FollowupContext, payload: FollowupPayload): Promise<CommandResult> {
    const { personId, applicationId, dueAt, note } = payload;
    if (!dueAt) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "DUE_DATE_REQUIRED", message: "A due date is required to schedule a follow-up." } };
    }

    const followupId = `followup_${Date.now()}`;
    const scheduledAt = new Date(dueAt);

    await context.eventStore.append({
      eventType: FOLLOWUP_SCHEDULED_EVENT,
      entityType: "followup",
      entityId: followupId,
      domain: this.domainSlug,
      manager: definition.manager,
      capability: "FollowupSchedulingCapability",
      worker: "FollowupSchedulingWorker",
      userId: command.userId,
      payload: { commandId: command.id, followupId, personId, applicationId, dueAt: scheduledAt.toISOString(), note },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { followupId, personId, applicationId, dueAt: scheduledAt.toISOString(), status: "due" },
      emittedEvents: [FOLLOWUP_SCHEDULED_EVENT],
      updatedProjections: [],
    };
  }

  private async handleExecute(command: CareerCommand, context: FollowupContext, payload: FollowupPayload): Promise<CommandResult> {
    const { followupId, note } = payload;
    if (!followupId) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "FOLLOWUP_ID_REQUIRED", message: "A followup ID is required to execute." } };
    }

    await context.eventStore.append({
      eventType: FOLLOWUP_EXECUTED_EVENT,
      entityType: "followup",
      entityId: followupId,
      domain: this.domainSlug,
      manager: definition.manager,
      capability: "FollowupExecutionCapability",
      worker: "FollowupReminderWorker",
      userId: command.userId,
      payload: { commandId: command.id, followupId, note, executedAt: new Date().toISOString() },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { followupId, status: "executed" },
      emittedEvents: [FOLLOWUP_EXECUTED_EVENT],
      updatedProjections: [],
    };
  }

  private async handleSnooze(command: CareerCommand, context: FollowupContext, payload: FollowupPayload): Promise<CommandResult> {
    const { followupId, snoozeHours = 24 } = payload;
    if (!followupId) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "FOLLOWUP_ID_REQUIRED", message: "A followup ID is required to snooze." } };
    }

    const snoozedUntil = new Date(Date.now() + snoozeHours * 60 * 60 * 1000);

    await context.eventStore.append({
      eventType: FOLLOWUP_SNOOZED_EVENT,
      entityType: "followup",
      entityId: followupId,
      domain: this.domainSlug,
      manager: definition.manager,
      userId: command.userId,
      payload: { commandId: command.id, followupId, snoozeHours, snoozedUntil: snoozedUntil.toISOString() },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { followupId, status: "snoozed", snoozedUntil: snoozedUntil.toISOString() },
      emittedEvents: [FOLLOWUP_SNOOZED_EVENT],
      updatedProjections: [],
    };
  }

  private async handleCancel(command: CareerCommand, context: FollowupContext, payload: FollowupPayload): Promise<CommandResult> {
    const { followupId, note } = payload;
    if (!followupId) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "FOLLOWUP_ID_REQUIRED", message: "A followup ID is required to cancel." } };
    }

    await context.eventStore.append({
      eventType: FOLLOWUP_CANCELLED_EVENT,
      entityType: "followup",
      entityId: followupId,
      domain: this.domainSlug,
      manager: definition.manager,
      userId: command.userId,
      payload: { commandId: command.id, followupId, note, cancelledAt: new Date().toISOString() },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { followupId, status: "cancelled" },
      emittedEvents: [FOLLOWUP_CANCELLED_EVENT],
      updatedProjections: [],
    };
  }
}

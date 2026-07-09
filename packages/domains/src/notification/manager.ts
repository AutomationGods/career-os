import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import { NOTIFICATION_BATCH_COMMAND, NOTIFICATION_SEND_COMMAND } from "./commands";
import { NOTIFICATION_BATCH_SENT_EVENT, NOTIFICATION_FAILED_EVENT, NOTIFICATION_SENT_EVENT } from "./events";

export const definition: DomainDefinition = {
  name: "Notification Domain",
  slug: "notification",
  manager: "Notification Manager",
  capabilities: ["InAppNotificationCapability", "BatchNotificationCapability"],
  workers: ["InAppNotificationWorker", "EmailDigestWorker"],
  tools: ["NotificationDeliveryTool"],
  commands: [NOTIFICATION_SEND_COMMAND, NOTIFICATION_BATCH_COMMAND],
  events: [NOTIFICATION_SENT_EVENT, NOTIFICATION_BATCH_SENT_EVENT, NOTIFICATION_FAILED_EVENT],
  permissions: [],
  dependencies: [],
  status: "implemented",
  version: "0.1.0",
};

type NotificationContext = DomainExecutionContext & { eventStore: EventStore };

export type NotificationType =
  | "followup_due"
  | "interview_reminder"
  | "application_status_change"
  | "daily_mission_ready"
  | "general";

interface NotificationPayload {
  type?: NotificationType;
  title?: string;
  body?: string;
  notifications?: Array<{ type: NotificationType; title: string; body: string }>;
}

export class NotificationManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "InAppNotificationCapability",
      workers: ["InAppNotificationWorker"],
      commands: [NOTIFICATION_SEND_COMMAND],
      events: [NOTIFICATION_SENT_EVENT, NOTIFICATION_FAILED_EVENT],
      permissions: [],
    },
    {
      name: "BatchNotificationCapability",
      workers: ["InAppNotificationWorker"],
      commands: [NOTIFICATION_BATCH_COMMAND],
      events: [NOTIFICATION_BATCH_SENT_EVENT, NOTIFICATION_FAILED_EVENT],
      permissions: [],
    },
  ];

  canHandle(command: CareerCommand) {
    return command.type === NOTIFICATION_SEND_COMMAND || command.type === NOTIFICATION_BATCH_COMMAND;
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as NotificationContext;
    if (command.type === NOTIFICATION_SEND_COMMAND) return this.handleSend(command, ctx, (command.payload ?? {}) as NotificationPayload);
    if (command.type === NOTIFICATION_BATCH_COMMAND) return this.handleBatch(command, ctx, (command.payload ?? {}) as NotificationPayload);
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleSend(command: CareerCommand, context: NotificationContext, payload: NotificationPayload): Promise<CommandResult> {
    const { type = "general", title, body } = payload;
    if (!title) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "TITLE_REQUIRED", message: "Notification title is required." } };
    }

    const notificationId = `notif_${Date.now()}`;

    await context.eventStore.append({
      eventType: NOTIFICATION_SENT_EVENT,
      entityType: "notification",
      entityId: notificationId,
      domain: this.domainSlug,
      manager: definition.manager,
      capability: "InAppNotificationCapability",
      worker: "InAppNotificationWorker",
      userId: command.userId,
      payload: { commandId: command.id, notificationId, type, title, body, sentAt: new Date().toISOString() },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { notificationId, type, title, body, read: false },
      emittedEvents: [NOTIFICATION_SENT_EVENT],
      updatedProjections: [],
    };
  }

  private async handleBatch(command: CareerCommand, context: NotificationContext, payload: NotificationPayload): Promise<CommandResult> {
    const { notifications } = payload;
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "NOTIFICATIONS_REQUIRED", message: "An array of notifications is required." } };
    }

    const results = notifications.map((n, i) => ({
      notificationId: `notif_${Date.now()}_${i}`,
      type: n.type ?? "general",
      title: n.title,
      body: n.body,
      read: false,
    }));

    await context.eventStore.append({
      eventType: NOTIFICATION_BATCH_SENT_EVENT,
      entityType: "notification",
      entityId: `batch_${Date.now()}`,
      domain: this.domainSlug,
      manager: definition.manager,
      capability: "BatchNotificationCapability",
      worker: "InAppNotificationWorker",
      userId: command.userId,
      payload: { commandId: command.id, count: results.length, results },
      confidence: 1,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { count: results.length, notifications: results },
      emittedEvents: [NOTIFICATION_BATCH_SENT_EVENT],
      updatedProjections: [],
    };
  }
}

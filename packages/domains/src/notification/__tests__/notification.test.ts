import { describe, expect, it } from "vitest";
import { NotificationManager } from "../manager";
import { NOTIFICATION_SEND_COMMAND, NOTIFICATION_BATCH_COMMAND } from "../commands";
import { createCommand } from "@career-os/orchestration";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import { snapshotStore } from "@career-os/snapshots";
import { PermissionPolicyService } from "@career-os/orchestration";

function createContext() {
  return { eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService() };
}

describe("NotificationManager", () => {
  const manager = new NotificationManager();

  it("canHandle returns true for notification commands", () => {
    expect(manager.canHandle(createCommand({ type: NOTIFICATION_SEND_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: NOTIFICATION_BATCH_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: "unknown", requestedBy: "api" }))).toBe(false);
  });

  it("sends a single notification", async () => {
    const command = createCommand({
      type: NOTIFICATION_SEND_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: { type: "followup_due", title: "Follow up with Acme Corp", body: "Your application is 3 days old" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { title: string }).title).toBe("Follow up with Acme Corp");
    expect(result.emittedEvents).toContain("notification.sent");
  });

  it("rejects when title is missing", async () => {
    const command = createCommand({
      type: NOTIFICATION_SEND_COMMAND,
      requestedBy: "api",
      payload: { type: "general" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("TITLE_REQUIRED");
  });

  it("sends batch notifications", async () => {
    const command = createCommand({
      type: NOTIFICATION_BATCH_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: {
        notifications: [
          { type: "followup_due", title: "Follow up 1", body: "body 1" },
          { type: "interview_reminder", title: "Interview tomorrow", body: "body 2" },
        ],
      },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect((result.data as { count: number }).count).toBe(2);
    expect(result.emittedEvents).toContain("notification.batch_sent");
  });

  it("rejects batch with empty array", async () => {
    const command = createCommand({
      type: NOTIFICATION_BATCH_COMMAND,
      requestedBy: "api",
      payload: { notifications: [] },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("NOTIFICATIONS_REQUIRED");
  });
});

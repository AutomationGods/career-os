import { describe, expect, it } from "vitest";
import { FollowUpAutomationManager } from "../manager";
import { FOLLOWUP_SCHEDULE_COMMAND, FOLLOWUP_EXECUTE_COMMAND, FOLLOWUP_SNOOZE_COMMAND, FOLLOWUP_CANCEL_COMMAND } from "../commands";
import { createCommand } from "@career-os/orchestration";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import { snapshotStore } from "@career-os/snapshots";
import { PermissionPolicyService } from "@career-os/orchestration";

function createContext() {
  return { eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService() };
}

describe("FollowUpAutomationManager", () => {
  const manager = new FollowUpAutomationManager();

  it("canHandle returns true for all followup commands", () => {
    expect(manager.canHandle(createCommand({ type: FOLLOWUP_SCHEDULE_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: FOLLOWUP_EXECUTE_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: FOLLOWUP_SNOOZE_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: FOLLOWUP_CANCEL_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: "unknown", requestedBy: "api" }))).toBe(false);
  });

  it("schedules a followup with a due date", async () => {
    const command = createCommand({
      type: FOLLOWUP_SCHEDULE_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: { personId: "person-1", dueAt: new Date(Date.now() + 86400000).toISOString(), note: "Follow up on application" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { status: string }).status).toBe("due");
    expect(result.emittedEvents).toContain("followup.scheduled");
  });

  it("rejects schedule without due date", async () => {
    const command = createCommand({
      type: FOLLOWUP_SCHEDULE_COMMAND,
      requestedBy: "api",
      payload: { personId: "person-1" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DUE_DATE_REQUIRED");
  });

  it("executes a followup by id", async () => {
    const command = createCommand({
      type: FOLLOWUP_EXECUTE_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: { followupId: "followup-1", note: "Sent email" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect((result.data as { status: string }).status).toBe("executed");
    expect(result.emittedEvents).toContain("followup.executed");
  });

  it("snoozes a followup", async () => {
    const command = createCommand({
      type: FOLLOWUP_SNOOZE_COMMAND,
      requestedBy: "api",
      payload: { followupId: "followup-1", snoozeHours: 48 },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect((result.data as { status: string }).status).toBe("snoozed");
  });

  it("cancels a followup", async () => {
    const command = createCommand({
      type: FOLLOWUP_CANCEL_COMMAND,
      requestedBy: "api",
      payload: { followupId: "followup-1" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect((result.data as { status: string }).status).toBe("cancelled");
  });
});

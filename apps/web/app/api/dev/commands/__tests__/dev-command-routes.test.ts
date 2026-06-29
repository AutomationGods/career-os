import { InMemoryEventStore } from "@career-os/events";
import { InMemoryApprovalRequestService, PermissionPolicyService, createCommandBus, createOrchestrator } from "@career-os/orchestration";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { runAllowedCommand, runDeniedCommand, runRequiresApprovalCommand } from "../_handlers";

function createTestCommandBus() {
  const eventStore = new InMemoryEventStore();
  const stateStore = new InMemoryStateStore();
  const snapshotStore = new InMemorySnapshotStore();
  const approvals = new InMemoryApprovalRequestService(eventStore);
  const orchestrator = createOrchestrator({
    eventStore,
    stateStore,
    snapshotStore,
    permissions: new PermissionPolicyService(),
    approvals
  });
  const bus = createCommandBus(orchestrator);
  return { approvals, bus };
}

describe("dev command route handlers", () => {
  it("runs the allowed demo command to completion", async () => {
    const { approvals, bus } = createTestCommandBus();

    const response = await runAllowedCommand(bus);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    expect(approvals.list().length).toBe(0);
  });

  it("creates a pending approval for the requires-approval demo command", async () => {
    const { approvals, bus } = createTestCommandBus();

    const response = await runRequiresApprovalCommand(bus);
    const body = await response.json();

    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("APPROVAL_REQUIRED");
    expect(body.command.status).toBe("requires_approval");
    expect(approvals.list().length).toBe(1);
    expect(approvals.list()[0]?.status).toBe("pending");
  });

  it("rejects the denied demo command without creating an approval", async () => {
    const { approvals, bus } = createTestCommandBus();

    const response = await runDeniedCommand(bus);
    const body = await response.json();

    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("COMMAND_DENIED");
    expect(body.command.status).toBe("rejected");
    expect(approvals.list().length).toBe(0);
  });

  it("blocks dev commands in production by default", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFlag = process.env.ENABLE_DEV_COMMANDS;
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.ENABLE_DEV_COMMANDS;

    try {
      const { approvals, bus } = createTestCommandBus();
      const response = await runAllowedCommand(bus);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(approvals.list().length).toBe(0);
    } finally {
      Object.assign(process.env, { NODE_ENV: originalNodeEnv });
      if (originalFlag === undefined) delete process.env.ENABLE_DEV_COMMANDS;
      else process.env.ENABLE_DEV_COMMANDS = originalFlag;
    }
  });
});

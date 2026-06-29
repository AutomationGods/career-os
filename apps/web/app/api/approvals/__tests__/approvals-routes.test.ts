import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { InMemoryApprovalRequestService, PermissionPolicyService, createApprovedReplayCommandBus, createCommand, createOrchestrator } from "@career-os/orchestration";
import { describe, expect, it } from "vitest";
import { approveApproval, cancelApproval, getApproval, listApprovals, rejectApproval, replayApproval } from "../_handlers";

function authRequest(path = "/api/approvals", init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-career-os-test-user-id", "user-1");
  headers.set("x-career-os-test-user-email", "user-1@example.com");
  if (init.method && init.method !== "GET") headers.set("origin", "http://localhost");
  return new Request(`http://localhost${path}`, { ...init, headers });
}

function createApprovalService() {
  const eventStore = new InMemoryEventStore();
  const service = new InMemoryApprovalRequestService(eventStore);
  const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: {} });
  const approval = service.createForCommand(command, new PermissionPolicyService().evaluate(command));
  return { service, approval };
}

describe("approval API handlers", () => {
  it("lists approvals", async () => {
    const { service } = createApprovalService();

    const response = await listApprovals(service, authRequest());
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approvals.length).toBe(1);
  });

  it("gets one approval", async () => {
    const { service, approval } = createApprovalService();

    const response = await getApproval(service, approval.id, authRequest(`/api/approvals/${approval.id}`));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.id).toBe(approval.id);
  });

  it("returns structured error for missing approval", async () => {
    const { service } = createApprovalService();

    const response = await getApproval(service, "missing", authRequest("/api/approvals/missing"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("APPROVAL_NOT_FOUND");
  });

  it("approves approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await approveApproval(service, approval.id, authRequest("/api/approvals/approve", { method: "POST", body: JSON.stringify({ decidedBy: "user-1" }) }));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("approved");
  });

  it("rejects approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await rejectApproval(service, approval.id, authRequest("/api/approvals/reject", { method: "POST", body: JSON.stringify({ reason: "No" }) }));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("rejected");
  });

  it("replays approved approval requests", async () => {
    const eventStore = new InMemoryEventStore();
    const service = new InMemoryApprovalRequestService(eventStore);
    const orchestrator = createOrchestrator({ eventStore, stateStore: new InMemoryStateStore(), snapshotStore: new InMemorySnapshotStore(), permissions: new PermissionPolicyService(), approvals: service });
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", entityType: "email", entityId: "email-1", payload: { to: "demo@example.invalid" } });
    const approval = service.createForCommand(command, new PermissionPolicyService().evaluate(command));
    service.approve(approval.id, { decidedBy: "user-1" });

    const response = await replayApproval(service, createApprovedReplayCommandBus(orchestrator), approval.id, authRequest(`/api/approvals/${approval.id}/replay`, { method: "POST", body: JSON.stringify({}) }));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.command.status).toBe("completed");
    expect(body.data.approval.replayStatus).toBe("completed");
  });

  it("cancels approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await cancelApproval(service, approval.id, authRequest("/api/approvals/cancel", { method: "POST", body: JSON.stringify({ reason: "Cancel" }) }));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("cancelled");
  });
});

import { InMemoryEventStore } from "@career-os/events";
import { InMemoryApprovalRequestService, PermissionPolicyService, createCommand } from "@career-os/orchestration";
import { describe, expect, it } from "vitest";
import { approveApproval, getApproval, listApprovals, rejectApproval } from "../_handlers";

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

    const response = await listApprovals(service);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approvals.length).toBe(1);
  });

  it("gets one approval", async () => {
    const { service, approval } = createApprovalService();

    const response = await getApproval(service, approval.id);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.id).toBe(approval.id);
  });

  it("returns structured error for missing approval", async () => {
    const { service } = createApprovalService();

    const response = await getApproval(service, "missing");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("APPROVAL_NOT_FOUND");
  });

  it("approves approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await approveApproval(service, approval.id, new Request("http://localhost/api/approvals/approve", { method: "POST", body: JSON.stringify({ decidedBy: "user-1" }) }));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("approved");
  });

  it("rejects approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await rejectApproval(service, approval.id, new Request("http://localhost/api/approvals/reject", { method: "POST", body: JSON.stringify({ reason: "No" }) }));
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("rejected");
  });
});

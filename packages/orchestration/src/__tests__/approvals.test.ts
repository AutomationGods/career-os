import { InMemoryEventStore } from "@career-os/events";
import { describe, expect, it } from "vitest";
import { InMemoryApprovalRequestService } from "../approvals";
import { createCommand } from "../command-bus";
import { PermissionPolicyService } from "../permissions";

describe("InMemoryApprovalRequestService", () => {
  it("creates approval requests and prevents duplicate pending requests for a command", () => {
    const eventStore = new InMemoryEventStore();
    const approvals = new InMemoryApprovalRequestService(eventStore);
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: { subject: "Hello" } });
    const decision = new PermissionPolicyService().evaluate(command);

    const first = approvals.createForCommand(command, decision);
    const second = approvals.createForCommand(command, decision);

    expect(first.id).toBe(second.id);
    expect(approvals.list().length).toBe(1);
    expect(eventStore.listByType("approval.requested").length).toBe(1);
  });

  it("approves approval requests and emits lifecycle events", () => {
    const eventStore = new InMemoryEventStore();
    const approvals = new InMemoryApprovalRequestService(eventStore);
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: {} });
    const request = approvals.createForCommand(command, new PermissionPolicyService().evaluate(command));

    const approved = approvals.approve(request.id, { decidedBy: "user-1" });

    expect(approved?.status).toBe("approved");
    expect(eventStore.listByType("approval.approved").length).toBe(1);
    expect(eventStore.listByType("command.approval_granted").length).toBe(1);
  });

  it("rejects approval requests and emits lifecycle events", () => {
    const eventStore = new InMemoryEventStore();
    const approvals = new InMemoryApprovalRequestService(eventStore);
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: {} });
    const request = approvals.createForCommand(command, new PermissionPolicyService().evaluate(command));

    const rejected = approvals.reject(request.id, { decidedBy: "user-1", reason: "Not now" });

    expect(rejected?.status).toBe("rejected");
    expect(eventStore.listByType("approval.rejected").length).toBe(1);
    expect(eventStore.listByType("command.approval_denied").length).toBe(1);
  });
});

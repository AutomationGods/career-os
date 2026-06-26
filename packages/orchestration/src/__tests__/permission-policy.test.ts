import { describe, expect, it } from "vitest";
import { createCommand } from "../command-bus";
import { PermissionPolicyService } from "../permissions";

describe("PermissionPolicyService", () => {
  const policy = new PermissionPolicyService();

  it("allows development-safe permissions", () => {
    const decision = policy.evaluate(createCommand({ type: "jobs.run_pipeline", requestedBy: "api", payload: {} }));

    expect(decision.status).toBe("allowed");
    expect(decision.permission).toBe("write_jobs");
  });

  it("requires approval for sensitive permissions", () => {
    const decision = policy.evaluate(createCommand({ type: "email.send", requestedBy: "api", payload: {} }));

    expect(decision.status).toBe("requires_approval");
    expect(decision.permission).toBe("send_email");
    expect(decision.requiresApproval).toBe(true);
  });

  it("denies disabled auto-submit commands", () => {
    const decision = policy.evaluate(createCommand({ type: "application.auto_submit", requestedBy: "api", payload: {} }));

    expect(decision.status).toBe("denied");
    expect(decision.permission).toBe("submit_application");
  });

  it("defaults unknown sensitive commands to requires approval", () => {
    const decision = policy.evaluate(createCommand({ type: "external.browser_submit", requestedBy: "api", payload: {} }));

    expect(decision.status).toBe("requires_approval");
    expect(decision.permission).toBe("submit_application");
  });
});

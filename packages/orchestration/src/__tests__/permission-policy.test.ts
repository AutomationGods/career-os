import { describe, expect, it } from "vitest";
import { createCommand } from "../command-bus";
import { PermissionPolicyService } from "../permissions";

describe("PermissionPolicyService", () => {
  const policy = new PermissionPolicyService();

  it("allows development-safe job write permissions", () => {
    const runDecision = policy.evaluate(createCommand({ type: "jobs.run_pipeline", requestedBy: "api", payload: {} }));
    const importDecision = policy.evaluate(createCommand({ type: "jobs.import_manual_url", requestedBy: "api", payload: {} }));

    expect(runDecision.status).toBe("allowed");
    expect(runDecision.permission).toBe("write_jobs");
    expect(importDecision.status).toBe("allowed");
    expect(importDecision.permission).toBe("write_jobs");
  });

  it("allows development-safe job read permissions", () => {
    const listDecision = policy.evaluate(createCommand({ type: "jobs.list", requestedBy: "api", payload: {} }));
    const getDecision = policy.evaluate(createCommand({ type: "jobs.get", requestedBy: "api", payload: {} }));

    expect(listDecision.status).toBe("allowed");
    expect(listDecision.permission).toBe("read_jobs");
    expect(getDecision.status).toBe("allowed");
    expect(getDecision.permission).toBe("read_jobs");
  });

  it("allows local Master Resume import in the Profile Facts v1 safety carve-out", () => {
    const decision = policy.evaluate(createCommand({ type: "master_resume.import", requestedBy: "api", payload: {} }));

    expect(decision.status).toBe("allowed");
    expect(decision.permission).toBe("modify_master_profile");
    expect(decision.requiresApproval).toBe(false);
  });

  it("allows local document export commands", () => {
    const decision = policy.evaluate(createCommand({ type: "document_exports.create_markdown", requestedBy: "api", payload: {} }));

    expect(decision.status).toBe("allowed");
    expect(decision.permission).toBe("export_document");
    expect(decision.requiresApproval).toBe(false);
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

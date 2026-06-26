import { describe, expect, it } from "vitest";
import { definition } from "../manager";
import { opportunityPlaybooks } from "../opportunity-playbooks";

describe("opportunity playbooks", () => {
  it("registers hidden-job and hiring-signal capabilities", () => {
    expect(definition.capabilities.includes("HiddenJobDiscoveryCapability")).toBe(true);
    expect(definition.capabilities.includes("HiringSignalDetectionCapability")).toBe(true);
    expect(definition.commands.includes("opportunity.hidden_jobs.plan")).toBe(true);
    expect(definition.commands.includes("opportunity.hiring_signals.plan")).toBe(true);
    expect(definition.events.includes("opportunity.hidden_jobs_planned")).toBe(true);
    expect(definition.events.includes("opportunity.hiring_signals_planned")).toBe(true);
  });

  it("keeps playbook actions planning-only with no auto-submit or external execution", () => {
    for (const playbook of opportunityPlaybooks) {
      for (const action of playbook.actions) {
        expect(action.guardrails.noAutoSubmit).toBe(true);
        expect(action.guardrails.noExternalExecution).toBe(true);
        expect(action.outputEvent.endsWith("_planned")).toBe(true);
        expect(action.stateProjection.includes("planned")).toBe(true);
      }
    }
  });
});

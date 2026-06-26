import { describe, expect, it } from "vitest";
import { relationshipDiscoveryPlaybooks } from "../discovery-playbooks";
import { definition } from "../manager";

describe("relationship discovery playbooks", () => {
  it("registers recruiter and hiring-manager discovery capabilities", () => {
    expect(definition.capabilities.includes("RecruiterDiscoveryCapability")).toBe(true);
    expect(definition.capabilities.includes("HiringManagerDiscoveryCapability")).toBe(true);
    expect(definition.commands.includes("relationships.discover_recruiters.plan")).toBe(true);
    expect(definition.commands.includes("relationships.discover_hiring_managers.plan")).toBe(true);
    expect(definition.events.includes("relationship.recruiter_discovery_planned")).toBe(true);
    expect(definition.events.includes("relationship.hiring_manager_discovery_planned")).toBe(true);
  });

  it("is discovery-only and disables LinkedIn scraping and auto-contact", () => {
    for (const playbook of relationshipDiscoveryPlaybooks) {
      expect(playbook.discoveryOnly).toBe(true);
      expect(playbook.guardrails.noLinkedInScraping).toBe(true);
      expect(playbook.guardrails.noAutoContact).toBe(true);
      expect(playbook.guardrails.noEmailSending).toBe(true);
      expect(playbook.prohibitedActions.includes("linkedin_scraping")).toBe(true);
      expect(playbook.prohibitedActions.includes("auto_contact")).toBe(true);
      expect(playbook.prohibitedActions.includes("email_sending")).toBe(true);
    }
  });
});

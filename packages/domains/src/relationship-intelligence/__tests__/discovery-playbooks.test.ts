import { describe, expect, it } from "vitest";
import { relationshipDiscoveryPlaybooks } from "../discovery-playbooks";
import { definition, RelationshipIntelligenceManager } from "../manager";
import { createCommand } from "@career-os/orchestration";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import { snapshotStore } from "@career-os/snapshots";
import { PermissionPolicyService } from "@career-os/orchestration";

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

  it("handles discover_recruiters.plan command", async () => {
    const manager = new RelationshipIntelligenceManager();
    const command = createCommand({
      type: "relationships.discover_recruiters.plan",
      requestedBy: "api",
      userId: "test-user",
      payload: { targetCompanies: ["Acme Corp"], region: "US" },
    });
    const context = { eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService() };

    expect(manager.canHandle(command)).toBe(true);
    const result = await manager.handle(command, context);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.emittedEvents).toContain("relationship.recruiter_discovery_planned");
    expect(result.data).toBeDefined();
    expect((result.data as { discoveryType: string }).discoveryType).toBe("recruiter");
    expect((result.data as { discoveryOnly: boolean }).discoveryOnly).toBe(true);
  });

  it("handles discover_hiring_managers.plan command", async () => {
    const manager = new RelationshipIntelligenceManager();
    const command = createCommand({
      type: "relationships.discover_hiring_managers.plan",
      requestedBy: "api",
      userId: "test-user",
      payload: { targetCompanies: ["Beta Inc"] },
    });
    const context = { eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService() };

    expect(manager.canHandle(command)).toBe(true);
    const result = await manager.handle(command, context);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.emittedEvents).toContain("relationship.hiring_manager_discovery_planned");
    expect(result.data).toBeDefined();
    expect((result.data as { discoveryType: string }).discoveryType).toBe("hiring_manager");
    expect((result.data as { discoveryOnly: boolean }).discoveryOnly).toBe(true);
  });
});

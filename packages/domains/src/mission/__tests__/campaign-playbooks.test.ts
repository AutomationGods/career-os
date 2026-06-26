import { describe, expect, it } from "vitest";
import { campaignTrackingPlaybook, searchCampaignStateProjection } from "../campaign-playbooks";
import { definition } from "../manager";

describe("campaign tracking playbook", () => {
  it("registers campaign tracking capability", () => {
    expect(definition.capabilities.includes("CampaignTrackingCapability")).toBe(true);
    expect(definition.commands.includes("mission.campaign_tracking.plan")).toBe(true);
    expect(definition.events.includes("mission.campaign_tracking_planned")).toBe(true);
  });

  it("tracks planned campaign events and state projections only", () => {
    expect(campaignTrackingPlaybook.plannedEvent).toBe("mission.campaign_tracking_planned");
    expect(campaignTrackingPlaybook.stateProjection).toBe(searchCampaignStateProjection);
    expect(campaignTrackingPlaybook.stateProjection.includes("planned")).toBe(true);
    expect(campaignTrackingPlaybook.guardrails.noAutoSubmit).toBe(true);
    expect(campaignTrackingPlaybook.guardrails.noAutoContact).toBe(true);
    expect(campaignTrackingPlaybook.guardrails.noExternalExecution).toBe(true);
  });
});

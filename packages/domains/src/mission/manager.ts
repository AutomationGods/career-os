import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Mission Domain",
  slug: "mission",
  manager: "Mission Manager",
  capabilities: ["DailyMissionGenerationCapability", "CampaignTrackingCapability"],
  workers: ["DailyMissionWorker", "CampaignTrackingWorker"],
  tools: ["MissionProjectionTool", "CampaignTrackingProjectionTool"],
  commands: ["daily_mission.generate", "mission.campaign_tracking.plan"],
  events: ["daily_mission.generated", "mission.campaign_tracking_planned"],
  permissions: ["read_jobs"],
  dependencies: ["opportunity-intelligence", "relationship-intelligence", "event-store", "state-store"],
  status: "partial",
  version: "0.2.0"
};

export class MissionManager { readonly definition = definition; }

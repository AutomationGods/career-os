import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Mission Domain",
  slug: "mission",
  manager: "Mission Manager",
  capabilities: ["DailyMissionGenerationCapability"],
  workers: ["DailyMissionWorker"],
  tools: ["MissionProjectionTool"],
  commands: ["daily_mission.generate"],
  events: ["daily_mission.generated"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class MissionManager { readonly definition = definition; }

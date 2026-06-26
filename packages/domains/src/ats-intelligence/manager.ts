import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "ATS Intelligence Domain",
  slug: "ats-intelligence",
  manager: "ATS Intelligence Manager",
  capabilities: [
    "ATS Detection Capability",
    "Job Collection Capability",
    "Job Detail Extraction Capability",
    "Application Flow Capability",
    "ATS Playbook Capability",
    "ATS Failure Analysis Capability"
  ],
  workers: [
    "Greenhouse Detection Worker",
    "Lever Detection Worker",
    "Ashby Detection Worker",
    "Workday Detection Worker",
    "iCIMS Detection Worker",
    "SmartRecruiters Detection Worker",
    "Taleo Detection Worker",
    "Oracle HCM Detection Worker",
    "ADP Detection Worker",
    "UKG Detection Worker",
    "BambooHR Detection Worker",
    "Jobvite Detection Worker",
    "Custom ATS Worker",
    "Unknown ATS Worker"
  ],
  tools: ["PublicPostingApiTool", "AtsFingerprintTool"],
  commands: ["ats-intelligence.execute"],
  events: ["ats-intelligence.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class AtsIntelligenceManager {
  readonly definition = definition;
}

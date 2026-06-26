import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Opportunity Intelligence Domain",
  slug: "opportunity-intelligence",
  manager: "Opportunity Intelligence Manager",
  capabilities: ["HiddenJobDiscoveryCapability", "HiringSignalDetectionCapability"],
  workers: ["HiddenJobDiscoveryWorker", "HiringSignalDetectionWorker"],
  tools: ["HiddenOpportunityPlanningTool", "HiringSignalCatalogTool"],
  commands: ["opportunity.hidden_jobs.plan", "opportunity.hiring_signals.plan"],
  events: ["opportunity.hidden_jobs_planned", "opportunity.hiring_signals_planned"],
  permissions: ["read_jobs"],
  dependencies: ["research", "event-store", "state-store"],
  status: "partial",
  version: "0.2.0"
};

export class OpportunityIntelligenceManager { readonly definition = definition; }

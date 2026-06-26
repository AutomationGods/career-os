import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Research Domain",
  slug: "research",
  manager: "Research Manager",
  capabilities: ["SearchIntelligenceCapability", "OSINTCompanyReconCapability"],
  workers: ["SearchPatternPlanningWorker", "OSINTCompanyReconWorker"],
  tools: ["SearchPatternCatalogTool", "CompanyReconChecklistTool"],
  commands: ["research.search_intelligence.plan", "research.company_recon.plan"],
  events: ["research.search_intelligence_planned", "research.company_recon_planned"],
  permissions: ["read_jobs"],
  dependencies: ["event-store", "state-store"],
  status: "partial",
  version: "0.2.0"
};

export class ResearchManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Opportunity Intelligence Domain",
  slug: "opportunity-intelligence",
  manager: "Opportunity Intelligence Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["opportunity-intelligence.execute"],
  events: ["opportunity-intelligence.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class OpportunityIntelligenceManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Market Intelligence Domain",
  slug: "market-intelligence",
  manager: "Market Intelligence Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["market-intelligence.execute"],
  events: ["market-intelligence.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class MarketIntelligenceManager { readonly definition = definition; }

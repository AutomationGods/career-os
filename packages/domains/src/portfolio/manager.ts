import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Portfolio Domain",
  slug: "portfolio",
  manager: "Portfolio Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["portfolio.execute"],
  events: ["portfolio.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class PortfolioManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Salary Intelligence Domain",
  slug: "salary-intelligence",
  manager: "Salary Intelligence Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["salary-intelligence.execute"],
  events: ["salary-intelligence.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class SalaryIntelligenceManager { readonly definition = definition; }

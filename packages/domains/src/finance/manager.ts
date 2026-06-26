import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Finance Domain",
  slug: "finance",
  manager: "Finance Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["finance.execute"],
  events: ["finance.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class FinanceManager { readonly definition = definition; }

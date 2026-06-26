import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "QA Domain",
  slug: "qa",
  manager: "QA Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["qa.execute"],
  events: ["qa.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class QaManager { readonly definition = definition; }

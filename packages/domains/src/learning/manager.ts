import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Learning Domain",
  slug: "learning",
  manager: "Learning Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["learning.execute"],
  events: ["learning.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class LearningManager { readonly definition = definition; }

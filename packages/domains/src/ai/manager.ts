import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "AI Domain",
  slug: "ai",
  manager: "AI Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["ai.execute"],
  events: ["ai.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class AiManager { readonly definition = definition; }

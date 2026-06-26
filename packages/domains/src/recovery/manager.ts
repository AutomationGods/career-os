import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Recovery Domain",
  slug: "recovery",
  manager: "Recovery Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["recovery.execute"],
  events: ["recovery.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class RecoveryManager { readonly definition = definition; }

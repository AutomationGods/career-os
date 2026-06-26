import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "State Store",
  slug: "state-store",
  manager: "State Store Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["state-store.execute"],
  events: ["state-store.completed"],
  permissions: [],
  dependencies: [],
  status: "partial",
  version: "0.1.0"
};

export class StateStoreManager { readonly definition = definition; }

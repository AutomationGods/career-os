import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Event Store",
  slug: "event-store",
  manager: "Event Store Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["event-store.execute"],
  events: ["event-store.completed"],
  permissions: [],
  dependencies: [],
  status: "partial",
  version: "0.1.0"
};

export class EventStoreManager { readonly definition = definition; }

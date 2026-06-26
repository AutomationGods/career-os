import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Remote Classification Domain",
  slug: "remote-classification",
  manager: "Remote Classification Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["remote-classification.execute"],
  events: ["remote-classification.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class RemoteClassificationManager { readonly definition = definition; }

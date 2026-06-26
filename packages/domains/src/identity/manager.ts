import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Identity Domain",
  slug: "identity",
  manager: "Identity Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["identity.execute"],
  events: ["identity.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class IdentityManager { readonly definition = definition; }

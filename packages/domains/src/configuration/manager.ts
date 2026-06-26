import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Configuration Domain",
  slug: "configuration",
  manager: "Configuration Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["configuration.execute"],
  events: ["configuration.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class ConfigurationManager { readonly definition = definition; }

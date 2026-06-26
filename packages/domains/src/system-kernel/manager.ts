import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "System Kernel Domain",
  slug: "system-kernel",
  manager: "System Kernel Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["system-kernel.execute"],
  events: ["system-kernel.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class SystemKernelManager { readonly definition = definition; }

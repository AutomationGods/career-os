import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Scheduler Domain",
  slug: "scheduler",
  manager: "Scheduler Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["scheduler.execute"],
  events: ["scheduler.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class SchedulerManager { readonly definition = definition; }

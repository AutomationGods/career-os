import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Workflow Domain",
  slug: "workflow",
  manager: "Workflow Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["workflow.execute"],
  events: ["workflow.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class WorkflowManager { readonly definition = definition; }

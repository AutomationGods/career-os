import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Follow-Up Automation Domain",
  slug: "follow-up-automation",
  manager: "Follow-Up Automation Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["follow-up-automation.execute"],
  events: ["follow-up-automation.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class FollowUpAutomationManager { readonly definition = definition; }

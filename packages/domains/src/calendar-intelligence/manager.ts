import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Calendar Intelligence Domain",
  slug: "calendar-intelligence",
  manager: "Calendar Intelligence Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["calendar-intelligence.execute"],
  events: ["calendar-intelligence.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class CalendarIntelligenceManager { readonly definition = definition; }

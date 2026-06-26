import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Browser Copilot Domain",
  slug: "browser-copilot",
  manager: "Browser Copilot Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["browser-copilot.execute"],
  events: ["browser-copilot.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class BrowserCopilotManager { readonly definition = definition; }

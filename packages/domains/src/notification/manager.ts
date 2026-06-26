import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Notification Domain",
  slug: "notification",
  manager: "Notification Manager",
  capabilities: ["Placeholder Capability"],
  workers: ["Placeholder Worker"],
  tools: ["Placeholder Tool"],
  commands: ["notification.execute"],
  events: ["notification.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class NotificationManager { readonly definition = definition; }

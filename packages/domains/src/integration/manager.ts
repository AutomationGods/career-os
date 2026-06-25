import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Integration Domain", slug: "integration", manager: "Integration Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["integration.execute"], events: ["integration.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class IntegrationManager { readonly definition = definition; }

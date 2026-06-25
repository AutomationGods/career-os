import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Browser Infrastructure Domain", slug: "browser-infrastructure", manager: "Browser Infrastructure Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["browser-infrastructure.execute"], events: ["browser-infrastructure.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class BrowserInfrastructureManager { readonly definition = definition; }

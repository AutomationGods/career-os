import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Security Domain", slug: "security", manager: "Security Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["security.execute"], events: ["security.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class SecurityManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Research Domain", slug: "research", manager: "Research Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["research.execute"], events: ["research.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class ResearchManager { readonly definition = definition; }

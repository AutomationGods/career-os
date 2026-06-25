import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Communications Domain", slug: "communications", manager: "Communications Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["communications.execute"], events: ["communications.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class CommunicationsManager { readonly definition = definition; }

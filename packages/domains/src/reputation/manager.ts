import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Reputation Domain", slug: "reputation", manager: "Reputation Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["reputation.execute"], events: ["reputation.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class ReputationManager { readonly definition = definition; }

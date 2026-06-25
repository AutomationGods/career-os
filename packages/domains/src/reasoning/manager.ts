import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Reasoning Domain", slug: "reasoning", manager: "Reasoning Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["reasoning.execute"], events: ["reasoning.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class ReasoningManager { readonly definition = definition; }

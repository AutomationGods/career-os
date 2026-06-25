import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Knowledge Domain", slug: "knowledge", manager: "Knowledge Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["knowledge.execute"], events: ["knowledge.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class KnowledgeManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Memory Domain", slug: "memory", manager: "Memory Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["memory.execute"], events: ["memory.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class MemoryManager { readonly definition = definition; }

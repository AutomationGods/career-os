import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Application Difficulty Domain", slug: "application-difficulty", manager: "Application Difficulty Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["application-difficulty.execute"], events: ["application-difficulty.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class ApplicationDifficultyManager { readonly definition = definition; }

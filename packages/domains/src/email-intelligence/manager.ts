import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Email Intelligence Domain", slug: "email-intelligence", manager: "Email Intelligence Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["email-intelligence.execute"], events: ["email-intelligence.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class EmailIntelligenceManager { readonly definition = definition; }

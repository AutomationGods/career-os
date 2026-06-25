import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Relationship Intelligence Domain", slug: "relationship-intelligence", manager: "Relationship Intelligence Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["relationship-intelligence.execute"], events: ["relationship-intelligence.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class RelationshipIntelligenceManager { readonly definition = definition; }

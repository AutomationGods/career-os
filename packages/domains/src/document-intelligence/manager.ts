import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Document Intelligence Domain", slug: "document-intelligence", manager: "Document Intelligence Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["document-intelligence.execute"], events: ["document-intelligence.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class DocumentIntelligenceManager { readonly definition = definition; }

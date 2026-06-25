import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Certification Intelligence Domain", slug: "certification-intelligence", manager: "Certification Intelligence Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["certification-intelligence.execute"], events: ["certification-intelligence.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class CertificationIntelligenceManager { readonly definition = definition; }

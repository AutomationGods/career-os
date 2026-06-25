import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Company Intelligence Domain", slug: "company-intelligence", manager: "Company Intelligence Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["company-intelligence.execute"], events: ["company-intelligence.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class CompanyIntelligenceManager { readonly definition = definition; }

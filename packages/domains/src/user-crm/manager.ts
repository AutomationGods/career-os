import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "User CRM Domain", slug: "user-crm", manager: "User CRM Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["user-crm.execute"], events: ["user-crm.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class UserCrmManager { readonly definition = definition; }

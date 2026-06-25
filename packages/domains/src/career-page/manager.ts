import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Career Page Domain", slug: "career-page", manager: "Career Page Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["career-page.execute"], events: ["career-page.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class CareerPageManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Trust & Safety Domain", slug: "trust-and-safety", manager: "Trust & Safety Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["trust-and-safety.execute"], events: ["trust-and-safety.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class TrustSafetyManager { readonly definition = definition; }

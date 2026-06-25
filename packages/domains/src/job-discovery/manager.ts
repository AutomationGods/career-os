import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Job Discovery Domain", slug: "job-discovery", manager: "Job Discovery Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["job-discovery.execute"], events: ["job-discovery.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class JobDiscoveryManager { readonly definition = definition; }

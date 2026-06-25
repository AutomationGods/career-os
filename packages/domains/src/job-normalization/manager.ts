import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Job Normalization Domain", slug: "job-normalization", manager: "Job Normalization Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["job-normalization.execute"], events: ["job-normalization.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class JobNormalizationManager { readonly definition = definition; }

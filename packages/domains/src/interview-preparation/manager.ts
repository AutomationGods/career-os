import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Interview Preparation Domain", slug: "interview-preparation", manager: "Interview Preparation Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["interview-preparation.execute"], events: ["interview-preparation.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class InterviewPreparationManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Resume Factory Domain", slug: "resume-factory", manager: "Resume Factory Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["resume-factory.execute"], events: ["resume-factory.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class ResumeFactoryManager { readonly definition = definition; }

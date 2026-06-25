import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Resume Template Domain", slug: "resume-template", manager: "Resume Template Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["resume-template.execute"], events: ["resume-template.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class ResumeTemplateManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Cover Letter Domain", slug: "cover-letter", manager: "Cover Letter Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["cover-letter.execute"], events: ["cover-letter.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class CoverLetterManager { readonly definition = definition; }

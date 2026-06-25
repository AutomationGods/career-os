import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Interview Follow-Up Domain", slug: "interview-follow-up", manager: "Interview Follow-Up Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["interview-follow-up.execute"], events: ["interview-follow-up.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class InterviewFollowUpManager { readonly definition = definition; }

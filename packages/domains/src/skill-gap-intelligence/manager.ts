import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Skill Gap Intelligence Domain", slug: "skill-gap-intelligence", manager: "Skill Gap Intelligence Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["skill-gap-intelligence.execute"], events: ["skill-gap-intelligence.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class SkillGapIntelligenceManager { readonly definition = definition; }

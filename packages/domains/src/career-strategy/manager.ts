import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Career Strategy Domain", slug: "career-strategy", manager: "Career Strategy Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["career-strategy.execute"], events: ["career-strategy.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class CareerStrategyManager { readonly definition = definition; }

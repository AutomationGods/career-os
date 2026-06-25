import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Fit Scoring Domain", slug: "fit-scoring", manager: "Fit Scoring Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["fit-scoring.execute"], events: ["fit-scoring.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class FitScoringManager { readonly definition = definition; }

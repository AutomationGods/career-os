import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Simulation Domain", slug: "simulation", manager: "Simulation Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["simulation.execute"], events: ["simulation.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class SimulationManager { readonly definition = definition; }

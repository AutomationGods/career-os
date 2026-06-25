import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Snapshot Store", slug: "snapshot-store", manager: "Snapshot Store Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["snapshot-store.execute"], events: ["snapshot-store.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class SnapshotStoreManager { readonly definition = definition; }

import type { DomainDefinition } from "@career-os/shared";
export const definition: DomainDefinition = { name: "Application Packet Domain", slug: "application-packet", manager: "Application Packet Manager", capabilities: ['Placeholder Capability'], workers: ['Placeholder Worker'], commands: ["application-packet.execute"], events: ["application-packet.completed"], permissions: [], dependencies: [], status: "placeholder", version: "0.1.0" };
export class ApplicationPacketManager { readonly definition = definition; }

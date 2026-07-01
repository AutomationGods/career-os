import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Application Packet Domain",
  slug: "application-packet",
  manager: "Application Packet Manager",
  capabilities: ["ApplicationPacketAssemblyCapability"],
  workers: ["ApplicationPacketWorker"],
  tools: ["PlaceholderGenerationTool"],
  commands: ["application_packets.create", "application_packets.generate_placeholders", "application_packets.update_status"],
  events: ["application_packet.created", "application_packet.updated", "application_packet.status_updated"],
  permissions: [],
  dependencies: ["event-store", "state-store", "job-intelligence", "resume-factory", "cover-letter", "relationship-intelligence"],
  status: "partial",
  version: "0.2.0"
};

export class ApplicationPacketManager { readonly definition = definition; }

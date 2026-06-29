export const capabilities = [{
  name: "ApplicationPacketAssemblyCapability",
  commands: [
    "application_packets.create",
    "application_packets.generate_placeholders",
    "application_packets.get",
    "application_packets.list",
    "application_packets.update_status"
  ],
  events: [
    "application_packet.created",
    "application_packet.updated",
    "application_packet.status_updated",
    "resume.placeholder_created",
    "cover_letter.placeholder_created",
    "recruiter_message.placeholder_created"
  ],
  workers: ["ApplicationPacketWorker"],
  permissions: ["export_document"]
}];

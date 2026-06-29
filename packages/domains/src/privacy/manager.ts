import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Privacy Domain",
  slug: "privacy",
  manager: "Privacy Manager",
  capabilities: ["UserDataExportCapability", "UserDataDeletionCapability"],
  workers: ["PrivacyExportWorker", "PrivacyDeletionWorker"],
  tools: ["PrivacyService"],
  commands: ["privacy.export_user_data", "privacy.delete_user_data"],
  events: ["privacy.export_requested", "privacy.delete_requested", "privacy.delete_completed"],
  permissions: ["read_own_data", "delete_own_data"],
  dependencies: ["identity", "job-discovery", "application-packet", "resume-factory", "document-export", "event-store", "state-store", "snapshot-store"],
  status: "implemented",
  version: "0.1.0"
};

export class PrivacyManager { readonly definition = definition; }

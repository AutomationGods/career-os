import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "System Kernel Domain",
  slug: "system-kernel",
  manager: "System Kernel Manager",
  capabilities: ["RuntimeAuditCapability"],
  workers: ["RuntimeAuditWorker"],
  tools: ["RuntimeManifestInspectorTool"],
  commands: ["system.runtime_audit"],
  events: ["runtime.audit_started", "runtime.audit_completed", "runtime.audit_failed"],
  permissions: [],
  dependencies: ["domain-registry", "event-store", "state-store"],
  status: "partial",
  version: "0.2.0"
};

export class SystemKernelManager { readonly definition = definition; }

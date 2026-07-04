import { domainRegistry, runtimeDescriptors } from "@career-os/domains";
import { buildRuntimeAuditReport, createInMemoryOrchestrator } from "@career-os/orchestration";

export const dynamic = "force-dynamic";

const auditOrchestrator = createInMemoryOrchestrator();
const runtimeAudit = buildRuntimeAuditReport({
  domains: domainRegistry,
  descriptors: runtimeDescriptors,
  runtimeWiredCommands: auditOrchestrator.listCommandTypes(),
  runtimeWiredManagers: auditOrchestrator.listRuntimeManagers()
});

function domainReadinessLabel(domain: (typeof domainRegistry)[number]) {
  return runtimeAudit.manifests.find((manifest) => manifest.domainId === domain.slug)?.readinessLabel ?? "Registered";
}

export default function DomainRegistryDevPage() {
  return (
    <main className="main">
      <span className="badge">Developer tool</span>
      <h1>Domain Registry</h1>
      <p className="muted">Internal registry of domain managers, commands, events, versions, and runtime readiness.</p>
      <div className="grid">
        {domainRegistry.map((domain) => (
          <div className="card" key={domain.slug}>
            <strong>{domain.name}</strong>
            <p className="muted">Manager: {domain.manager}</p>
            <p className="muted">Version: {domain.version}</p>
            <p className="muted">Commands: {domain.commands.length} · Events: {domain.events.length}</p>
            <span className="badge">{domainReadinessLabel(domain)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

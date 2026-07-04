import { domainRegistry, runtimeDescriptors } from "@career-os/domains";
import { buildRuntimeAuditReport, createInMemoryOrchestrator } from "@career-os/orchestration";

export const dynamic = "force-dynamic";

const auditOrchestrator = createInMemoryOrchestrator();

function shortList(values: string[], empty = "None") {
  if (values.length === 0) return empty;
  return values.slice(0, 8).join(", ") + (values.length > 8 ? ` +${values.length - 8} more` : "");
}

export default function RuntimeAuditDevPage() {
  const runtimeAudit = buildRuntimeAuditReport({
    domains: domainRegistry,
    descriptors: runtimeDescriptors,
    runtimeWiredCommands: auditOrchestrator.listCommandTypes(),
    runtimeWiredManagers: auditOrchestrator.listRuntimeManagers()
  });
  const activeDomains = runtimeAudit.manifests.filter((manifest) => manifest.active);
  const registeredButUnwiredDomains = runtimeAudit.manifests.filter((manifest) => !manifest.runtimeWired && manifest.status !== "placeholder");
  const placeholderDomains = runtimeAudit.manifests.filter((manifest) => manifest.status === "placeholder");

  return (
    <main className="main">
      <span className="badge">Developer system check</span>
      <h1>Runtime Audit</h1>
      <p className="muted">Developer-only view of runtime wiring, placeholder domains, commands, tools, and descriptors.</p>
      <section className="section">
        <h2>Summary</h2>
        <div className="grid">
          <div className="card"><strong>{activeDomains.length}</strong><p className="muted">active domains</p></div>
          <div className="card"><strong>{runtimeAudit.runtimeWiredCommands}</strong><p className="muted">runtime-wired commands</p></div>
          <div className="card"><strong>{registeredButUnwiredDomains.length}</strong><p className="muted">registered but not wired domains</p></div>
          <div className="card"><strong>{placeholderDomains.length}</strong><p className="muted">placeholder domains</p></div>
          <div className="card"><strong>{runtimeAudit.commandsMissingHandlers.length}</strong><p className="muted">commands missing handlers</p></div>
          <div className="card"><strong>{runtimeAudit.toolsActive.length}</strong><p className="muted">tools active</p></div>
        </div>
      </section>
      <section className="section">
        <h2>Details</h2>
        <div className="grid">
          <div className="card"><strong>Active domains</strong><p className="muted">{shortList(activeDomains.map((domain) => domain.displayName))}</p></div>
          <div className="card"><strong>Needs wiring</strong><p className="muted">{shortList(registeredButUnwiredDomains.map((domain) => domain.displayName))}</p></div>
          <div className="card"><strong>Placeholders</strong><p className="muted">{shortList(placeholderDomains.map((domain) => domain.displayName))}</p></div>
          <div className="card"><strong>Commands missing handlers</strong><p className="muted">{shortList(runtimeAudit.commandsMissingHandlers)}</p></div>
          <div className="card"><strong>Tools active</strong><p className="muted">{shortList(runtimeAudit.toolsActive)}</p></div>
          <div className="card"><strong>Tools inactive</strong><p className="muted">{shortList(runtimeAudit.toolsRegisteredButInactive)}</p></div>
        </div>
      </section>
    </main>
  );
}

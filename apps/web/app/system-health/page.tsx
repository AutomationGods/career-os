import { domainRegistry } from "@career-os/domains";
import { eventStore } from "@career-os/events";
import { createInMemoryOrchestrator, localApprovalRequestService } from "@career-os/orchestration";
import { snapshotStore } from "@career-os/snapshots";
import { stateStore } from "@career-os/state";

export const dynamic = "force-dynamic";

const commandBackedCommands = new Set(createInMemoryOrchestrator().listCommandTypes());

async function getApprovalCounts() {
  try {
    const approvals = await Promise.resolve(localApprovalRequestService.list());
    return {
      total: approvals.length,
      pending: approvals.filter((approval) => approval.status === "pending").length,
      approved: approvals.filter((approval) => approval.status === "approved").length,
      rejected: approvals.filter((approval) => approval.status === "rejected").length
    };
  } catch {
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
}

function readinessLabel(domain: (typeof domainRegistry)[number]) {
  if (domain.status === "implemented") return "Implemented";
  if (domain.commands.some((command) => commandBackedCommands.has(command))) return "Command-backed";
  if (domain.status === "disabled") return "Disabled";
  if (domain.status === "deprecated") return "Retired";
  return "Manager registered";
}

export default async function SystemHealthPage() {
  const approvalCounts = await getApprovalCounts();
  const events = eventStore.list();
  const projections = stateStore.list();
  const snapshots = snapshotStore.list();
  const commandBackedDomains = domainRegistry.filter((domain) => domain.commands.some((command) => commandBackedCommands.has(command)));
  const implementedDomains = domainRegistry.filter((domain) => domain.status === "implemented");

  return (
    <main className="main">
      <span className="badge">System Kernel Manager</span>
      <h1>System Health</h1>
      <p className="muted">Operational view for command routing, approvals, event history, state projections, snapshots, and domain manager coverage.</p>

      <section className="section">
        <h2>Runtime Signals</h2>
        <div className="grid">
          <div className="card"><strong>{domainRegistry.length}</strong><p className="muted">registered domain managers</p></div>
          <div className="card"><strong>{commandBackedCommands.size}</strong><p className="muted">command handlers online</p></div>
          <div className="card"><strong>{events.length}</strong><p className="muted">events recorded</p></div>
          <div className="card"><strong>{projections.length}</strong><p className="muted">state projections</p></div>
          <div className="card"><strong>{snapshots.length}</strong><p className="muted">snapshots captured</p></div>
          <div className="card"><strong>{approvalCounts.pending}</strong><p className="muted">pending approvals</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Manager Coverage</h2>
        <div className="grid">
          <div className="card">
            <strong>{implementedDomains.length}</strong>
            <p className="muted">implemented managers</p>
          </div>
          <div className="card">
            <strong>{commandBackedDomains.length}</strong>
            <p className="muted">command-backed managers</p>
          </div>
          <a className="card linked-card" href="/approvals">
            <strong>Approval Requests</strong>
            <p className="muted">{approvalCounts.total} total · {approvalCounts.approved} approved · {approvalCounts.rejected} rejected</p>
          </a>
          <a className="card linked-card" href="/job-pipeline-results">
            <strong>Job Pipeline Results</strong>
            <p className="muted">Open the data-backed job projection view.</p>
          </a>
        </div>
      </section>

      <section className="section">
        <h2>Domain Manager Readiness</h2>
        <div className="grid">
          {domainRegistry.map((domain) => (
            <div className="card" key={domain.slug}>
              <strong>{domain.name}</strong>
              <p className="muted">Manager: {domain.manager}</p>
              <p className="muted">Commands: {domain.commands.length} · Events: {domain.events.length}</p>
              <span className="badge">{readinessLabel(domain)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

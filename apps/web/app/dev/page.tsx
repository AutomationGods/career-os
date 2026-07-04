const devTools = [
  { href: "/dev/system-health", label: "System Health", description: "Command routing, state, approvals, and runtime signals." },
  { href: "/dev/runtime-audit", label: "Runtime Audit", description: "Developer-only domain wiring and placeholder audit." },
  { href: "/dev/domain-registry", label: "Domain Registry", description: "Registered domain managers, commands, events, and readiness labels." },
  { href: "/dev/approvals", label: "Approval Requests", description: "Approval queue and command replay test surface." },
  { href: "/dev/resume-demo", label: "Resume Demo", description: "Safe demo generator for the resume draft command." },
  { href: "/dev/demo-data", label: "Demo Data", description: "Local data seeding and event/state/snapshot touchpoints." }
];

export default function DevToolsPage() {
  return (
    <main className="main">
      <span className="badge">Developer tools</span>
      <h1>Dev Console</h1>
      <p className="muted">Internal diagnostics, demos, and scaffolding live here so the product stays focused on job-search work.</p>
      <div className="grid">
        {devTools.map((tool) => (
          <a className="card linked-card" href={tool.href} key={tool.href}>
            <strong>{tool.label}</strong>
            <p className="muted">{tool.description}</p>
          </a>
        ))}
      </div>
    </main>
  );
}

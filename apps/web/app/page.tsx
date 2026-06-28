import { domainRegistry } from "@career-os/domains";

function toWorkspaceSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const workspaceLabels = [
  "Today’s Mission",
  "Jobs",
  "Companies",
  "Applications",
  "Recruiters / Relationships",
  "Email Center",
  "Calendar / Interviews",
  "Resume Factory",
  "Master Resume Import",
  "Documents",
  "Follow-Ups",
  "Market Intelligence",
  "Skill Gaps",
  "Settings",
  "System Health",
  "Approval Requests",
  "Application Packets",
  "Packet Detail",
  "Relationships",
  "Relationship Detail",
  "Job Pipeline Results",
  "Admin / Domain Registry"
];

const workspaces = workspaceLabels.map((label) => ({ label, id: toWorkspaceSlug(label) }));
const primaryWorkspaceIds = new Set(["todays-mission", "jobs", "applications", "admin-domain-registry"]);

const missionCards = [
  "top remote commercial jobs",
  "hybrid commercial jobs",
  "onsite commercial jobs",
  "clearance/government separated jobs",
  "low-fit jobs",
  "jobs ready for packet generation",
  "packets awaiting review",
  "follow-ups due placeholder",
  "estimated apply time placeholder"
];

const jobSections = [
  "Remote Commercial",
  "Hybrid Commercial",
  "Onsite Commercial",
  "Contract",
  "Clearance / Government",
  "Low Fit",
  "Archived / Rejected"
];

const appSections = [
  "Ready to Apply",
  "Awaiting Review",
  "Submitted",
  "Follow-Up Due",
  "Interviewing",
  "Rejected",
  "Offer Received",
  "Closed"
];

export default function Page() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Career OS</div>
        <nav className="nav">
          {workspaces.map((workspace) => (
            <a key={workspace.id} href={`#${workspace.id}`}>
              {workspace.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="main">
        <span className="badge">Platform-first foundation</span>
        <h1>Reusable automation platform running Career OS</h1>
        <p className="muted">
          Event-driven dashboard shell with human approval gates; no auto-submit and no LinkedIn scraping.
        </p>

        <section className="section">
          <h2>Source of Truth</h2>
          <div className="grid">
            <a className="card" href="/master-resume"><strong>Master Resume Import</strong><p className="muted">Paste resume text into needs-review Profile Facts.</p></a>
            <a className="card" href="/profile-facts"><strong>Profile Facts</strong><p className="muted">Verify or block facts before document generation.</p></a>
            <a className="card" href="/resumes"><strong>Resume Factory</strong><p className="muted">Generate drafts from verified facts only.</p></a>
            <a className="card" href="/documents"><strong>Documents</strong><p className="muted">Download local Markdown and DOCX exports.</p></a>
          </div>
        </section>

        <section id="todays-mission" className="section">
          <h2>Today’s Mission</h2>
          <div className="grid">
            {missionCards.map((item) => (
              <div className="card" key={item}>
                <strong>0</strong>
                <br />
                <span className="muted">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="jobs" className="section">
          <h2>Jobs</h2>
          <div className="grid">
            {jobSections.map((section) => (
              <div className="card" key={section}>
                {section}
                <p className="muted">Segmented, never blindly deleted.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="applications" className="section">
          <h2>Applications</h2>
          <div className="grid">
            {appSections.map((section) => (
              <div className="card" key={section}>{section}</div>
            ))}
          </div>
        </section>

        {workspaces
          .filter((workspace) => !primaryWorkspaceIds.has(workspace.id))
          .map((workspace) => (
            <section id={workspace.id} className="section" key={workspace.id}>
              <h2>{workspace.label}</h2>
              <div className="card">
                <span className="muted">Workspace navigation target.</span>
              </div>
            </section>
          ))}

        <section id="admin-domain-registry" className="section">
          <h2>Domain Registry</h2>
          <div className="grid">
            {domainRegistry.map((domain) => (
              <div className="card" key={domain.slug}>
                <strong>{domain.name}</strong>
                <p className="muted">{domain.manager}</p>
                <span className="badge">{domain.status}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

import { domainRegistry } from "@career-os/domains";

const workspaces = [
  "Today’s Mission",
  "Jobs",
  "Companies",
  "Applications",
  "Recruiters / Relationships",
  "Email Center",
  "Calendar / Interviews",
  "Resume Factory",
  "Documents",
  "Follow-Ups",
  "Market Intelligence",
  "Skill Gaps",
  "Settings",
  "System Health",
  "Application Packets",
  "Packet Detail",
  "Relationships",
  "Relationship Detail",
  "Job Pipeline Results",
  "Admin / Domain Registry"
];

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
            <a key={workspace} href={`#${workspace}`}>
              {workspace}
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

        <section id="Today’s Mission" className="section">
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

        <section id="Jobs" className="section">
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

        <section id="Applications" className="section">
          <h2>Applications</h2>
          <div className="grid">
            {appSections.map((section) => (
              <div className="card" key={section}>{section}</div>
            ))}
          </div>
        </section>

        <section id="Admin / Domain Registry" className="section">
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

import { readFeatureFlags } from "@career-os/config";
import { domainRegistry } from "@career-os/domains";

function toWorkspaceSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const mvpWorkspaceLinks = [
  { label: "Jobs", href: "/jobs", description: "Paste a job, persist it, and run local segmentation/scoring." },
  { label: "Application Packets", href: "/application-packets", description: "Create a durable manual application workspace from a saved job." },
  { label: "Master Resume", href: "/master-resume", description: "Import resume text into reviewable Profile Facts." },
  { label: "Profile Facts", href: "/profile-facts", description: "Verify or block claims before any draft uses them." },
  { label: "Resume Factory", href: "/resumes", description: "Generate truthfulness-guarded drafts from verified facts only." },
  { label: "Documents", href: "/documents", description: "Export local Markdown and DOCX files; no upload or submit." },
  { label: "Settings", href: "/settings", description: "Export or delete your user-owned Career OS data." }
];

const futureWorkspaceLabels = [
  "Today’s Mission",
  "Companies",
  "Applications Board",
  "Recruiters / Relationships",
  "Email Center",
  "Calendar / Interviews",
  "Follow-Ups",
  "Market Intelligence",
  "Skill Gaps",
  "System Health",
  "Relationship Detail",
  "Job Pipeline Results",
  "Admin / Domain Registry"
];

const applyLoopSteps = [
  "1. Import a pasted job",
  "2. Create an application packet",
  "3. Generate review-required drafts",
  "4. Generate a verified-facts resume",
  "5. Export locally",
  "6. Apply manually and update status"
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

const packetSections = [
  "Ready to Generate",
  "Awaiting Review",
  "Ready to Apply Manually",
  "Submitted Manually",
  "Follow-Up Due",
  "Closed"
];

export default function Page() {
  const showPlaceholderDomains = readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS;

  return (
    <main className="main">
      <span className="badge">Manual-safe MVP apply loop</span>
      <h1>Career OS for applying to jobs today</h1>
      <p className="muted">
        Import jobs, create packets, generate verified-facts drafts, export locally, and track manual status. No auto-submit, email send, upload, scraping, or browser automation.
      </p>

        <section className="section">
          <h2>Source of Truth</h2>
          <div className="grid">
            {mvpWorkspaceLinks.map((workspace) => (
              <a className="card" href={workspace.href} key={workspace.href}>
                <strong>{workspace.label}</strong>
                <p className="muted">{workspace.description}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Apply Loop</h2>
          <div className="grid">
            {applyLoopSteps.map((item) => (
              <div className="card" key={item}>
                <strong>{item}</strong>
                <p className="muted">Implemented in the MVP path.</p>
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
                <p className="muted">Segmented local job evidence; never blindly deleted.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="application-packets" className="section">
          <h2>Application Packets</h2>
          <div className="grid">
            {packetSections.map((section) => (
              <div className="card" key={section}>
                {section}
                <p className="muted">Durable packet status for manual application tracking.</p>
              </div>
            ))}
          </div>
        </section>

        {showPlaceholderDomains ? (
          <section id="future-modules" className="section">
            <h2>Future modules</h2>
            <p className="muted">These modules stay registered for the platform roadmap, but they are parked until after the MVP apply loop.</p>
            <div className="grid">
              {futureWorkspaceLabels.map((label) => (
                <div className="card" id={toWorkspaceSlug(label)} key={label}>
                  <strong>{label}</strong>
                  <p className="muted">Future expansion module; not presented as production-ready today.</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {showPlaceholderDomains ? (
          <section id="admin-domain-registry" className="section">
            <h2>Domain Registry</h2>
            <p className="muted">Registry status is honest: placeholder domains are not part of the shipped MVP loop.</p>
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
        ) : null}
    </main>
  );
}

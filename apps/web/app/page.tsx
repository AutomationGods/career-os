import { domainRegistry } from "@career-os/domains";
import { createInMemoryOrchestrator } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "./api/_lib/auth";
import { getPersistentRuntimeCounts, listPersistentApplicationPackets, listPersistentJobDashboardProjections, listPersistentRelationshipPeople } from "./api/_lib/persistent-state";
import DataTouchpointsPanel from "./data-touchpoints-panel";

export const dynamic = "force-dynamic";

interface WorkspaceNavigationItem {
  label: string;
  href: string;
}

interface WorkspaceAction {
  label: string;
  href: string;
}

interface WorkspaceMetric {
  label: string;
  value: string | number;
}

interface WorkspaceManagerView {
  id: string;
  title: string;
  manager: string;
  description: string;
  metrics: WorkspaceMetric[];
  actions: WorkspaceAction[];
}

const missionCards = [
  "scored jobs ready to inspect",
  "jobs ready for packet generation",
  "packets awaiting review",
  "packets ready to apply manually",
  "follow-ups due",
  "local exports recorded",
  "external sends/submits blocked"
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
  "Ready to Generate",
  "Awaiting Review",
  "Ready to Apply Manually",
  "Follow-Up Due",
  "Closed"
];

const commandBackedCommands = new Set(createInMemoryOrchestrator().listCommandTypes());
const localDemoRoutesEnabled = process.env.CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES === "true";

function buildWorkspaceNavigation(packetDetailHref: string, relationshipDetailHref: string): WorkspaceNavigationItem[] {
  return [
    { label: "Find Jobs", href: "/job-discovery" },
    { label: "Today’s Mission", href: "#todays-mission" },
    { label: "Jobs", href: "#jobs" },
    { label: "Companies", href: "#companies" },
    { label: "Applications", href: "#applications" },
    { label: "Recruiters / Relationships", href: "/relationships" },
    { label: "Email Center", href: "#email-center" },
    { label: "Calendar / Interviews", href: "#calendar-interviews" },
    { label: "Resume Factory Demo", href: "/resumes" },
    { label: "Documents", href: "#documents" },
    { label: "Follow-Ups", href: "#follow-ups" },
    { label: "Market Intelligence", href: "#market-intelligence" },
    { label: "Skill Gaps", href: "#skill-gaps" },
    { label: "Settings", href: "#settings" },
    { label: "System Health", href: "/system-health" },
    { label: "Approval Requests", href: "/approvals" },
    { label: "Application Packets", href: "/application-packets" },
    { label: "Packet Detail", href: packetDetailHref },
    { label: "Relationships", href: "/relationships" },
    { label: "Relationship Detail", href: relationshipDetailHref },
    { label: "Job Pipeline Results", href: "/job-pipeline-results" },
    { label: "Admin / Domain Registry", href: "#admin-domain-registry" }
  ];
}

function buildWorkspaceManagerViews(packetCount: number, relationshipCount: number, jobProjectionCount: number, snapshotCount: number): WorkspaceManagerView[] {
  return [
    {
      id: "companies",
      title: "Companies",
      manager: "Company Intelligence Manager",
      description: "Company records are assembled from selected jobs, packet company data, and relationship context.",
      metrics: [
        { label: "company-linked packets", value: packetCount },
        { label: "relationship records", value: relationshipCount }
      ],
      actions: [{ label: "Review company-linked packets", href: "/application-packets" }]
    },
    {
      id: "email-center",
      title: "Email Center",
      manager: "Communications Manager",
      description: "Gmail read-only sync is future work; email sending and recruiter outreach remain disabled until explicit approval-gated integrations exist.",
      metrics: [
        { label: "gmail read-only sync", value: "future" },
        { label: "external sends", value: "blocked" }
      ],
      actions: [{ label: "Open approval requests", href: "/approvals" }]
    },
    {
      id: "calendar-interviews",
      title: "Calendar / Interviews",
      manager: "Calendar Intelligence Manager",
      description: "Interview scheduling commands are surfaced through approval policy before calendar writes occur.",
      metrics: [
        { label: "calendar writes", value: "approval-gated" },
        { label: "interview records", value: 0 }
      ],
      actions: [{ label: "Review system health", href: "/system-health" }]
    },
    {
      id: "documents",
      title: "Documents",
      manager: "Document Intelligence Manager",
      description: "Document workspaces connect resume drafts, packet drafts, source snapshots, and local markdown exports.",
      metrics: [
        { label: "application packets", value: packetCount },
        { label: "snapshots", value: snapshotCount }
      ],
      actions: [{ label: "Open current packet", href: "/application-packets" }]
    },
    {
      id: "follow-ups",
      title: "Follow-Ups",
      manager: "Follow-Up Automation Manager",
      description: "Follow-up queues use relationship records and manual packet status; automatic outreach remains disabled.",
      metrics: [
        { label: "relationships", value: relationshipCount },
        { label: "scheduled sends", value: "approval-gated future" }
      ],
      actions: [{ label: "Open relationships", href: "/relationships" }]
    },
    {
      id: "market-intelligence",
      title: "Market Intelligence",
      manager: "Market Intelligence Manager",
      description: "Market views consume job pipeline projections, fit scoring, and segment signals.",
      metrics: [
        { label: "job projections", value: jobProjectionCount },
        { label: "segments", value: jobSections.length }
      ],
      actions: [{ label: "Open pipeline results", href: "/job-pipeline-results" }]
    },
    {
      id: "skill-gaps",
      title: "Skill Gaps",
      manager: "Skill Gap Intelligence Manager",
      description: "Skill gaps are derived from target keywords, resume grounding, and fit-scoring evidence.",
      metrics: [
        { label: "resume guard", value: "implemented" },
        { label: "fit segments", value: jobSections.length }
      ],
      actions: [{ label: "Open Resume Factory demo", href: "/resumes" }]
    },
    {
      id: "settings",
      title: "Settings",
      manager: "Configuration Manager",
      description: "Settings show the current safety posture: local data, human approvals, manual application tracking, and no automatic submission.",
      metrics: [
        { label: "human approval gates", value: "on" },
        { label: "automatic submission", value: "off" }
      ],
      actions: [{ label: "Review domain registry", href: "#admin-domain-registry" }]
    }
  ];
}

function domainReadinessLabel(domain: (typeof domainRegistry)[number]) {
  if (domain.status === "implemented") return "Implemented";
  if (domain.commands.some((command) => commandBackedCommands.has(command))) return "Command-backed";
  if (domain.status === "disabled") return "Disabled";
  if (domain.status === "deprecated") return "Retired";
  return "Manager registered";
}

function WorkspaceManagerSection({ view }: { view: WorkspaceManagerView }) {
  return (
    <section id={view.id} className="section">
      <span className="badge">{view.manager}</span>
      <h2>{view.title}</h2>
      <p className="muted">{view.description}</p>
      <div className="grid">
        {view.metrics.map((metric) => (
          <div className="card" key={`${view.id}-${metric.label}`}>
            <strong>{metric.value}</strong>
            <br />
            <span className="muted">{metric.label}</span>
          </div>
        ))}
        {view.actions.map((action) => (
          <a className="card linked-card" href={action.href} key={`${view.id}-${action.href}`}>
            <strong>{action.label}</strong>
            <p className="muted">Open the implemented manager destination.</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default async function Page() {
  const authUser = await requireAuthenticatedCareerUser();
  const [packets, relationships, jobProjections, runtimeCounts] = await Promise.all([
    listPersistentApplicationPackets(authUser.userId),
    listPersistentRelationshipPeople(authUser.userId),
    listPersistentJobDashboardProjections(authUser.userId),
    getPersistentRuntimeCounts(authUser.userId)
  ]);
  const packetDetailHref = packets[0] ? `/application-packets/${packets[0].id}` : "/packet-detail";
  const relationshipDetailHref = relationships[0] ? `/relationships/${relationships[0].id}` : "/relationship-detail";
  const workspaces = buildWorkspaceNavigation(packetDetailHref, relationshipDetailHref);
  const workspaceManagerViews = buildWorkspaceManagerViews(packets.length, relationships.length, jobProjections.length, runtimeCounts.snapshots);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Career OS</div>
        <nav className="nav">
          {workspaces.map((workspace) => (
            <a key={`${workspace.label}-${workspace.href}`} href={workspace.href}>
              {workspace.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="main">
        <span className="badge">Safe manual application workflow</span>
        <h1>Find jobs, build packets, export locally, follow up manually</h1>
        <p className="muted">
          Find Jobs → Score/Review → Create Packet → Generate Grounded Resume → Review/Export Locally → Track Status/Follow-Up. No automatic submission, Gmail sending, recruiter outreach, browser automation, or LinkedIn scraping.
        </p>

        <DataTouchpointsPanel enabled={localDemoRoutesEnabled} />

        <section id="todays-mission" className="section">
          <span className="badge">Mission Manager</span>
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
          <span className="badge">Job Intelligence Manager</span>
          <h2>Jobs</h2>
          <div className="grid">
            <a className="card linked-card" href="/job-discovery">
              <strong>Find Jobs</strong>
              <p className="muted">Search Remotive public listings and import scored opportunities.</p>
            </a>
            {jobSections.map((section) => (
              <div className="card" key={section}>
                <strong>{section}</strong>
                <p className="muted">Segmented, scored, and retained for review.</p>
              </div>
            ))}
            <a className="card linked-card" href="/job-pipeline-results">
              <strong>Pipeline Results</strong>
              <p className="muted">Review source-attributed job dashboard projections and create packets.</p>
            </a>
          </div>
        </section>

        <section id="applications" className="section">
          <span className="badge">Application Packet Manager</span>
          <h2>Packets + Resume</h2>
          <div className="grid">
            {appSections.map((section) => (
              <div className="card" key={section}><strong>{section}</strong></div>
            ))}
            <a className="card linked-card" href="/application-packets">
              <strong>Application Packets</strong>
              <p className="muted">Open packet assembly, grounded resume generation, local export, review status, and next actions.</p>
            </a>
          </div>
        </section>

        {workspaceManagerViews.map((view) => <WorkspaceManagerSection view={view} key={view.id} />)}

        <section id="admin-domain-registry" className="section">
          <span className="badge">Registry Manager</span>
          <h2>Domain Registry</h2>
          <p className="muted">Every domain entry shows its manager view, runtime readiness label, and integration counts without exposing draft scaffolding states.</p>
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
        </section>
      </main>
    </div>
  );
}

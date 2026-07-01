import { requireAuthenticatedCareerUser } from "../api/_lib/auth";
import { listPersistentJobDashboardProjections } from "../api/_lib/persistent-state";
import JobDiscoveryPanel from "./job-discovery-panel";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, fallback = "n/a") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default async function JobDiscoveryPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const projections = await listPersistentJobDashboardProjections(authUser.userId);
  const latestJobs = projections.slice(0, 6).map((projection) => {
    const data = isRecord(projection.data) ? projection.data : {};
    const normalizedJob = isRecord(data.normalizedJob) ? data.normalizedJob : {};
    return {
      id: projection.entityId,
      title: text(normalizedJob.title, projection.entityId),
      company: text(normalizedJob.company),
      source: text(normalizedJob.source),
      segment: text(data.dashboardSegment),
      fitScore: typeof data.fitScore === "number" ? data.fitScore : undefined
    };
  });

  return (
    <main className="main">
      <span className="badge">Job Discovery Manager</span>
      <h1>Find Jobs</h1>
      <p className="muted hero-copy">
        Search selected public worldwide job sources, enforce your keyword locally, normalize matches into the job pipeline, and create packets from scored matches.
      </p>

      <JobDiscoveryPanel />

      <section className="section">
        <h2>Current scored jobs</h2>
        {latestJobs.length > 0 ? (
          <div className="grid">
            {latestJobs.map((job) => (
              <div className="card" key={job.id}>
                <strong>{job.title}</strong>
                <p className="muted">{job.company} · {job.source}</p>
                <p>Segment: {job.segment}</p>
                <p>Fit score: {job.fitScore ?? "n/a"}</p>
              </div>
            ))}
            <a className="card linked-card primary-action-card" href="/job-pipeline-results">
              <strong>Open all pipeline results</strong>
              <p className="muted">Review every discovered job and start an application packet.</p>
            </a>
          </div>
        ) : (
          <div className="card">
            <p className="muted">No scored jobs yet. Run Find Jobs above to import public listings.</p>
          </div>
        )}
      </section>
    </main>
  );
}

import { stateStore } from "@career-os/state";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, fallback = "n/a") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberText(value: unknown) {
  return typeof value === "number" ? String(value) : "n/a";
}

export default async function JobPipelineResultsPage() {
  const projections = await Promise.resolve(stateStore.listByProjectionType("job.dashboard_segment"));

  return (
    <main className="main">
      <span className="badge">Data-backed</span>
      <h1>Job Pipeline Results</h1>
      <p className="muted">Pipeline runs write snapshots, events, and the current job dashboard segment projection.</p>

      {projections.length > 0 ? (
        <div className="grid">
          {projections.map((projection) => {
            const data = isRecord(projection.data) ? projection.data : {};
            const job = isRecord(data.normalizedJob) ? data.normalizedJob : {};
            return (
              <div className="card" key={projection.id}>
                <strong>{text(job.title, projection.entityId)}</strong>
                <p className="muted">{text(job.company)} · {text(job.location)}</p>
                <p>Dashboard segment: {text(data.dashboardSegment)}</p>
                <p>Remote classification: {text(data.remoteClassification)}</p>
                <p>Fit score: {numberText(data.fitScore)}</p>
                <p>Application difficulty: {numberText(data.applicationDifficultyScore)}</p>
                <p className="muted">Updated: {projection.updatedAt.toISOString()}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <p className="muted">No job pipeline projections yet. Open the dashboard and click “Seed Demo Data Touchpoints” to run the local pipeline.</p>
        </div>
      )}
    </main>
  );
}

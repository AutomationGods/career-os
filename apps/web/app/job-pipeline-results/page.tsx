import { listApplicationPackets } from "@career-os/domains";
import { stateStore } from "@career-os/state";
import ApplicationPacketAction from "./application-packet-action";

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

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export default async function JobPipelineResultsPage() {
  const projections = await Promise.resolve(stateStore.listByProjectionType("job.dashboard_segment"));
  const packetByJobId = new Map(listApplicationPackets().map((packet) => [packet.jobId, packet.id]));

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
            const jobId = text(data.jobId, projection.entityId);
            const dashboardSegment = text(data.dashboardSegment);
            const remoteClassification = text(data.remoteClassification);
            const applicationDifficulty = numberText(data.applicationDifficultyScore);
            const selectedJob = {
              title: text(job.title, projection.entityId),
              company: text(job.company),
              location: optionalText(job.location),
              description: optionalText(job.description),
              url: optionalText(job.url),
              employmentType: optionalText(job.employmentType),
              source: text(job.source, "job-pipeline-results")
            };
            const existingPacketId = packetByJobId.get(jobId);
            return (
              <div className="card" key={projection.id}>
                <strong>{selectedJob.title}</strong>
                <p className="muted">{selectedJob.company} · {selectedJob.location ?? "n/a"}</p>
                <p>Dashboard segment: {dashboardSegment}</p>
                <p>Remote classification: {remoteClassification}</p>
                <p>Fit score: {numberText(data.fitScore)}</p>
                <p>Application difficulty: {applicationDifficulty}</p>
                <p className="muted">Updated: {projection.updatedAt.toISOString()}</p>
                <ApplicationPacketAction
                  existingPacketHref={existingPacketId ? `/application-packets/${existingPacketId}` : undefined}
                  fitScoreSummary={{
                    score: numberValue(data.fitScore),
                    segment: dashboardSegment,
                    highlights: [
                      `Dashboard segment: ${dashboardSegment}`,
                      `Remote classification: ${remoteClassification}`,
                      `Application difficulty: ${applicationDifficulty}`
                    ]
                  }}
                  jobId={jobId}
                  selectedCompany={{ name: selectedJob.company }}
                  selectedJob={selectedJob}
                />
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

import { requireAuthenticatedCareerUser } from "../api/_lib/auth";
import { listPersistentApplicationPackets, listPersistentJobDashboardProjections } from "../api/_lib/persistent-state";
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

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export default async function JobPipelineResultsPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const [projections, packets] = await Promise.all([
    listPersistentJobDashboardProjections(authUser.userId),
    listPersistentApplicationPackets(authUser.userId)
  ]);
  const packetByJobId = new Map(packets.map((packet) => [packet.jobId, packet.id]));

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
            const fitSummary = isRecord(data.fitScoreSummary) ? data.fitScoreSummary : {};
            const matchedKeywords = stringList(fitSummary.matchedKeywords);
            const missingKeywords = stringList(fitSummary.missingKeywords);
            const scoringReason = text(fitSummary.scoringReason, "Static keyword match score.");
            const selectedJob = {
              title: text(job.title, projection.entityId),
              company: text(job.company),
              location: optionalText(job.location),
              description: optionalText(job.description),
              url: optionalText(job.url),
              employmentType: optionalText(job.employmentType),
              source: text(job.source, "job-pipeline-results")
            };
            const sourceLabel = selectedJob.source === "Remotive" ? "Remotive public API" : selectedJob.source;
            const existingPacketId = packetByJobId.get(jobId);
            return (
              <div className="card" key={projection.id}>
                <strong>{selectedJob.title}</strong>
                <p className="muted">{selectedJob.company} · {selectedJob.location ?? "n/a"}</p>
                <p>Source: {sourceLabel}</p>
                {selectedJob.url ? <p><a href={selectedJob.url} target="_blank" rel="noreferrer">Open original job listing</a></p> : null}
                <p>Dashboard segment: {dashboardSegment}</p>
                <p>Remote classification: {remoteClassification}</p>
                <p>Fit score: {numberText(data.fitScore)}</p>
                <p className="muted">Reason: {scoringReason}</p>
                {matchedKeywords.length > 0 ? <p>Matched keywords: {matchedKeywords.slice(0, 10).join(", ")}</p> : null}
                {missingKeywords.length > 0 ? <p className="muted">Missing keywords: {missingKeywords.slice(0, 10).join(", ")}</p> : null}
                <p>Application difficulty: {applicationDifficulty}</p>
                <p className="muted">Updated: {projection.updatedAt.toISOString()}</p>
                <ApplicationPacketAction
                  existingPacketHref={existingPacketId ? `/application-packets/${existingPacketId}` : undefined}
                  fitScoreSummary={{
                    score: numberValue(data.fitScore),
                    segment: dashboardSegment,
                    highlights: [
                      scoringReason,
                      `Matched: ${matchedKeywords.slice(0, 6).join(", ") || "none"}`,
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
          <p className="muted">No job pipeline projections yet. Open Find Jobs to import public Remotive listings.</p>
          <p><a href="/job-discovery">Find Jobs →</a></p>
        </div>
      )}
    </main>
  );
}

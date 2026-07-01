"use client";

import { useState } from "react";
import {
  DEFAULT_JOB_DISCOVERY_LIMIT,
  DEFAULT_JOB_DISCOVERY_QUERY,
  buildJobDiscoveryPayload,
  jobDiscoveryResultFromEnvelope,
  type JobDiscoveryResultView,
  type JobDiscoverySource
} from "./job-discovery-panel-model";

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function LatestDiscoveryResult({ result }: { result?: JobDiscoveryResultView }) {
  if (!result) return <p className="muted">No discovery run yet. Search public worldwide sources to import scored jobs.</p>;

  if (result.errorMessage) {
    return <p role="alert">{result.errorCode}: {result.errorMessage}</p>;
  }

  return (
    <div className="grid">
      <div className="card">
        <strong>Imported</strong>
        <p className="muted">{result.imported} jobs</p>
      </div>
      <div className="card">
        <strong>Run ID</strong>
        <p className="muted">{result.runId ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Source</strong>
        <p className="muted">{result.source ?? "all"}</p>
      </div>
      <div className="card">
        <strong>Next step</strong>
        <p><a href="/job-pipeline-results">Open scored job results →</a></p>
      </div>
      {result.jobs.slice(0, 6).map((job) => (
        <div className="card" key={job.jobId}>
          <strong>{job.title}</strong>
          <p className="muted">{job.company} · {job.source} · Fit {job.fitScore} · {job.dashboardSegment}</p>
          <p><a href={job.url} target="_blank" rel="noreferrer">View original listing</a></p>
        </div>
      ))}
    </div>
  );
}

export default function JobDiscoveryPanel() {
  const [query, setQuery] = useState(DEFAULT_JOB_DISCOVERY_QUERY);
  const [limit, setLimit] = useState(String(DEFAULT_JOB_DISCOVERY_LIMIT));
  const [source, setSource] = useState<JobDiscoverySource>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to search public worldwide job sources.");
  const [result, setResult] = useState<JobDiscoveryResultView | undefined>(undefined);

  async function runSearch() {
    const payload = buildJobDiscoveryPayload({ query, limit, source });
    setIsLoading(true);
    setStatusMessage(`Searching ${payload.source === "all" ? "all public sources" : payload.source} for “${payload.query}”...`);
    setResult(undefined);

    try {
      const response = await fetch("/api/job-discovery/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await readJson(response);
      const parsedResult = jobDiscoveryResultFromEnvelope(body);
      setResult(parsedResult);

      if (!response.ok || parsedResult.errorMessage) {
        setStatusMessage(parsedResult.errorMessage ?? "Job discovery failed.");
        return;
      }

      setStatusMessage(`Imported ${parsedResult.imported} public jobs. No emails, uploads, submits, or browser actions ran.`);
    } catch (error) {
      setResult({ imported: 0, jobs: [], errorCode: "NETWORK_ERROR", errorMessage: error instanceof Error ? error.message : "Unknown network error." });
      setStatusMessage("Network/runtime error while calling job discovery.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="section warning-card" aria-label="Source and safety warning">
        <h2>Source + safety</h2>
        <ul className="compact-list">
          <li>Jobs come from selected public APIs: Remotive, Remote OK, and Arbeitnow.</li>
          <li>This only performs public GET discovery, local keyword filtering, and local scoring.</li>
          <li>Gmail sending, recruiter outreach, browser automation, uploads, and auto-apply remain disabled.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Find public jobs</h2>
        <div className="card form-card">
          <label>
            Search query
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label>
            Source
            <select value={source} onChange={(event) => setSource(event.target.value as JobDiscoverySource)}>
              <option value="all">All public sources</option>
              <option value="remotive">Remotive</option>
              <option value="remoteok">Remote OK</option>
              <option value="arbeitnow">Arbeitnow</option>
            </select>
          </label>
          <label>
            Limit
            <input type="number" min="1" max="50" value={limit} onChange={(event) => setLimit(event.target.value)} />
          </label>
          <button type="button" disabled={isLoading} onClick={() => void runSearch()}>
            {isLoading ? "Finding Jobs..." : "Find Jobs"}
          </button>
          <p className="muted" aria-live="polite">{statusMessage}</p>
        </div>
      </section>

      <section className="section">
        <h2>Latest discovery run</h2>
        <LatestDiscoveryResult result={result} />
      </section>
    </>
  );
}

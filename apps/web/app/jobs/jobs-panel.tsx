"use client";

import { useEffect, useMemo, useState } from "react";
import {
  JOBS_DEMO_USER_ID,
  buildManualJobImportPayload,
  buildResumePayloadDefaultsFromJob,
  buildSafeDemoJobPayload,
  difficultyScoreForJob,
  fitScoreForJob,
  groupJobsByDashboardSegment,
  jobFromImportEnvelope,
  jobsFromListEnvelope,
  segmentForJob,
  snapshotIdForJob,
  type ManualJobFormFields,
  type PersistedJobView
} from "./jobs-panel-model";

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function defaultFormFields(): ManualJobFormFields {
  const demo = buildSafeDemoJobPayload();
  return {
    userId: demo.userId ?? JOBS_DEMO_USER_ID,
    url: demo.url ?? "",
    title: demo.title,
    companyName: demo.companyName,
    location: demo.location ?? "",
    employmentType: demo.employmentType ?? "",
    description: demo.description,
    certificationsText: demo.certifications.join(", "),
    requiredFieldsText: demo.requiredFields.join(", "),
    hasEasyApply: Boolean(demo.hasEasyApply)
  };
}

function ErrorMessage({ message }: { message?: string }) {
  return message ? <p role="alert">{message}</p> : null;
}

function JobCard({ job }: { job: PersistedJobView }) {
  const resumeDefaults = buildResumePayloadDefaultsFromJob(job);
  const sourceUrl = job.url ?? job.sources.find((source) => source.url)?.url;

  return (
    <div className="card">
      <strong>{job.title}</strong>
      <p className="muted">{job.company?.name ?? "Unknown company"} · {job.location ?? "Location not provided"}</p>
      <p className="muted">segment: {segmentForJob(job)}</p>
      <p className="muted">fit score: {fitScoreForJob(job)} · application difficulty: {difficultyScoreForJob(job)}</p>
      <p className="muted">job ID: {job.id}</p>
      <p className="muted">company ID: {job.companyId ?? "n/a"}</p>
      <p className="muted">snapshot ID: {snapshotIdForJob(job)}</p>
      {sourceUrl ? <p><a href={sourceUrl} target="_blank" rel="noreferrer">Open source URL</a></p> : <p className="muted">source URL: n/a</p>}
      <div className="card">
        <strong>Packet / Resume helper</strong>
        <p className="muted">jobId: {resumeDefaults.jobId}</p>
        <p className="muted">companyId: {resumeDefaults.companyId ?? "resolved from persisted job"}</p>
        <p className="muted">suggested applicationPacketId: {resumeDefaults.applicationPacketId}</p>
        <p className="muted">Use these IDs with /application-packets or /resumes. No external submission is performed.</p>
      </div>
    </div>
  );
}

function SegmentedJobs({ jobs }: { jobs: PersistedJobView[] }) {
  const groups = useMemo(() => groupJobsByDashboardSegment(jobs), [jobs]);
  const segments = Object.keys(groups).sort();

  if (jobs.length === 0) return <div className="card"><p className="muted">No persisted jobs yet. Import a pasted job description to start.</p></div>;

  return (
    <div>
      {segments.map((segment) => (
        <section className="section" key={segment}>
          <h2>{segment}</h2>
          <div className="grid">
            {groups[segment].map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function JobsPanel() {
  const [fields, setFields] = useState<ManualJobFormFields>(defaultFormFields());
  const [jobs, setJobs] = useState<PersistedJobView[]>([]);
  const [latestJob, setLatestJob] = useState<PersistedJobView | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("Ready for pasted/manual job data only.");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void refreshJobs();
  }, []);

  function updateField(field: keyof ManualJobFormFields, value: string | boolean) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function refreshJobs() {
    try {
      const response = await fetch(`/api/jobs?userId=${encodeURIComponent(fields.userId || JOBS_DEMO_USER_ID)}`, { cache: "no-store" });
      const body = await readJson(response);
      setJobs(jobsFromListEnvelope(body));
    } catch {
      setJobs([]);
    }
  }

  async function importJob() {
    setIsLoading(true);
    setErrorMessage(undefined);
    setStatusMessage("Persisting manual job data and running local segmentation/scoring...");
    try {
      const payload = buildManualJobImportPayload(fields);
      const response = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await readJson(response);
      const importedJob = jobFromImportEnvelope(body);
      if (!response.ok || !importedJob) throw new Error("Manual job import failed.");
      setLatestJob(importedJob);
      await refreshJobs();
      setStatusMessage("Job persisted locally. Pipeline segmentation/scoring completed; no scraping, upload, submit, or apply action happened.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown job import failure.");
      setStatusMessage("Manual job import failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="section warning-card" aria-label="Manual-only safety limits">
        <h2>Manual-only job discovery</h2>
        <ul className="compact-list">
          <li>Paste job data yourself; Career OS does not fetch, crawl, scrape, browse, upload, submit, or auto-apply.</li>
          <li>URL is stored as evidence only.</li>
          <li>Resume Factory still uses verified Profile Facts only.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Import Manual Job</h2>
        <div className="card form-card">
          <label>User ID<input value={fields.userId} onChange={(event) => updateField("userId", event.target.value)} /></label>
          <label>Source URL<input value={fields.url} onChange={(event) => updateField("url", event.target.value)} /></label>
          <label>Title<input value={fields.title} onChange={(event) => updateField("title", event.target.value)} /></label>
          <label>Company<input value={fields.companyName} onChange={(event) => updateField("companyName", event.target.value)} /></label>
          <label>Location<input value={fields.location} onChange={(event) => updateField("location", event.target.value)} /></label>
          <label>Employment type<input value={fields.employmentType} onChange={(event) => updateField("employmentType", event.target.value)} /></label>
          <label>Description<textarea rows={8} value={fields.description} onChange={(event) => updateField("description", event.target.value)} /></label>
          <label>Certifications, comma-separated<input value={fields.certificationsText} onChange={(event) => updateField("certificationsText", event.target.value)} /></label>
          <label>Required fields, comma-separated<input value={fields.requiredFieldsText} onChange={(event) => updateField("requiredFieldsText", event.target.value)} /></label>
          <label><span><input type="checkbox" checked={fields.hasEasyApply} onChange={(event) => updateField("hasEasyApply", event.target.checked)} /> Easy apply shown in pasted data</span></label>
          <div className="button-row">
            <button type="button" disabled={isLoading} onClick={() => void importJob()}>{isLoading ? "Importing..." : "Import Manual Job"}</button>
            <button type="button" disabled={isLoading} onClick={() => void refreshJobs()}>Refresh Jobs</button>
          </div>
          <p className="muted" aria-live="polite">{statusMessage}</p>
          <ErrorMessage message={errorMessage} />
        </div>
      </section>

      <section className="section">
        <h2>Latest Import</h2>
        {latestJob ? <div className="grid"><JobCard job={latestJob} /></div> : <div className="card"><p className="muted">No import in this browser session yet.</p></div>}
      </section>

      <section className="section">
        <h2>Persisted Jobs</h2>
        <SegmentedJobs jobs={jobs} />
      </section>
    </>
  );
}

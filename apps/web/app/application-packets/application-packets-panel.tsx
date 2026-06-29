"use client";

import { useEffect, useMemo, useState } from "react";
import { jobsFromListEnvelope, type PersistedJobView } from "../jobs/jobs-panel-model";
import {
  APPLICATION_PACKET_STATUSES,
  APPLICATION_PACKET_STATUS_LABELS,
  applicationPacketFromEnvelope,
  applicationPacketsFromListEnvelope,
  buildPacketPayloadDefaultsFromJob,
  defaultCreatePacketFormFields,
  groupApplicationPacketsByStatus,
  safetyLabelForPacket,
  type ApplicationPacketView,
  type CreatePacketFormFields
} from "./application-packets-model";

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function ErrorMessage({ message }: { message?: string }) {
  return message ? <p role="alert">{message}</p> : null;
}

function DraftPreview({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="card">
      <strong>{label}</strong>
      <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{value}</p>
    </div>
  );
}

function PacketCard({ packet }: { packet: ApplicationPacketView }) {
  const company = packet.selectedCompany?.name ?? packet.selectedJob.company;
  return (
    <div className="card">
      <strong>{packet.selectedJob.title}</strong>
      <p className="muted">{company} · {APPLICATION_PACKET_STATUS_LABELS[packet.status]}</p>
      <p className="muted">packet ID: {packet.id}</p>
      <p className="muted">job ID: {packet.jobId}</p>
      <p className="muted">fit: {packet.fitScoreSummary.score}/100 · {packet.fitScoreSummary.segment}</p>
      {packet.fitScoreSummary.highlights.length > 0 ? <p className="muted">highlights: {packet.fitScoreSummary.highlights.join(", ")}</p> : null}
      <p className="muted">next: {packet.nextAction}</p>
      <p className="muted">{safetyLabelForPacket(packet)}</p>
      <p><a href={`/application-packets/${encodeURIComponent(packet.id)}`}>Open packet workspace</a></p>
      <DraftPreview label="Resume draft brief" value={packet.resumePlaceholder} />
      <DraftPreview label="Cover letter draft" value={packet.coverLetterPlaceholder} />
      <DraftPreview label="Recruiter message draft" value={packet.recruiterMessagePlaceholder} />
    </div>
  );
}

export default function ApplicationPacketsPanel() {
  const [fields, setFields] = useState<CreatePacketFormFields>(defaultCreatePacketFormFields());
  const [jobs, setJobs] = useState<PersistedJobView[]>([]);
  const [packets, setPackets] = useState<ApplicationPacketView[]>([]);
  const [latestPacket, setLatestPacket] = useState<ApplicationPacketView | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("Loading application packets...");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const grouped = useMemo(() => groupApplicationPacketsByStatus(packets), [packets]);
  const selectedJob = jobs.find((job) => job.id === fields.jobId);

  async function refreshAll() {
    setErrorMessage(undefined);
    const [jobsResponse, packetsResponse] = await Promise.all([
      fetch("/api/jobs", { cache: "no-store" }),
      fetch("/api/application-packets", { cache: "no-store" })
    ]);
    const [jobsBody, packetsBody] = await Promise.all([readJson(jobsResponse), readJson(packetsResponse)]);
    const parsedJobs = jobsFromListEnvelope(jobsBody);
    const parsedPackets = applicationPacketsFromListEnvelope(packetsBody);
    setJobs(parsedJobs);
    setPackets(parsedPackets);
    setStatusMessage(parsedPackets.length > 0 ? `Loaded ${parsedPackets.length} durable packet(s).` : "No packets yet. Import a job, then create a packet from its job ID.");
    if (!fields.jobId && parsedJobs[0]) setFields((current) => ({ ...current, jobId: parsedJobs[0].id }));
  }

  useEffect(() => {
    void refreshAll().catch(() => setStatusMessage("Could not load jobs or application packets."));
  }, []);

  function updateField(field: keyof CreatePacketFormFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function createPacket() {
    setIsLoading(true);
    setErrorMessage(undefined);
    setStatusMessage("Creating durable application packet...");
    try {
      const payload = selectedJob ? buildPacketPayloadDefaultsFromJob(selectedJob) : { jobId: fields.jobId };
      const response = await fetch("/api/application-packets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await readJson(response);
      const packet = applicationPacketFromEnvelope(body);
      if (!response.ok || !packet) throw new Error("Application packet creation failed. Check that the job ID exists in persisted jobs.");
      setLatestPacket(packet);
      setStatusMessage("Packet created. Generate drafts in the packet workspace; no external application action happened.");
      await refreshAll();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown packet creation failure.");
      setStatusMessage("Packet creation failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <section className="section warning-card" aria-label="Manual application packet safety limits">
        <h2>Manual-safe application workspace</h2>
        <ul className="compact-list">
          <li>Packets organize job evidence, local drafts, status, and next action.</li>
          <li>Career OS does not auto-submit, send email, upload files, browse, or apply externally.</li>
          <li>Generated text is a review-required draft and must stay grounded in verified Profile Facts.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Create Packet from Saved Job</h2>
        <div className="card form-card">
          <label>Saved job<select value={fields.jobId} onChange={(event) => updateField("jobId", event.target.value)}>
            <option value="">Enter job ID manually below</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title} · {job.company?.name ?? "Unknown company"}</option>)}
          </select></label>
          <label>Job ID<input value={fields.jobId} onChange={(event) => updateField("jobId", event.target.value)} placeholder="job_..." /></label>
          <div className="button-row">
            <button type="button" disabled={isLoading || !fields.jobId} onClick={() => void createPacket()}>{isLoading ? "Creating..." : "Create Packet"}</button>
            <button type="button" disabled={isLoading} onClick={() => void refreshAll()}>Refresh</button>
          </div>
          <p className="muted" aria-live="polite">{statusMessage}</p>
          <ErrorMessage message={errorMessage} />
        </div>
      </section>

      <section className="section">
        <h2>Latest Packet</h2>
        {latestPacket ? <div className="grid"><PacketCard packet={latestPacket} /></div> : <div className="card"><p className="muted">No packet created in this browser session yet.</p></div>}
      </section>

      <section className="section">
        <h2>Durable Packets by Status</h2>
        {APPLICATION_PACKET_STATUSES.map((status) => (
          <section className="section" key={status}>
            <h3>{APPLICATION_PACKET_STATUS_LABELS[status]}</h3>
            <div className="grid">
              {(grouped[status] ?? []).map((packet) => <PacketCard key={packet.id} packet={packet} />)}
              {(grouped[status] ?? []).length === 0 ? <div className="card"><p className="muted">No packets in this status.</p></div> : null}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}

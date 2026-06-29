"use client";

import { useEffect, useState } from "react";
import { APPLICATION_PACKET_STATUS_LABELS, applicationPacketFromEnvelope, safetyLabelForPacket, type ApplicationPacketStatus, type ApplicationPacketView } from "../application-packets-model";

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resultFromEnvelope(envelope: unknown) {
  if (!isRecord(envelope) || envelope.ok !== true || !isRecord(envelope.data)) return undefined;
  return isRecord(envelope.data.result) ? envelope.data.result : envelope.data;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringArrayFromText(value: string) {
  return value.split(/\n|;/).map((item) => item.trim()).filter(Boolean);
}

function DraftTextarea({ label, value }: { label: string; value?: string }) {
  return (
    <label>
      {label}
      <textarea rows={8} readOnly value={value ?? "Generate packet drafts to fill this copyable field."} />
    </label>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  return message ? <p role="alert">{message}</p> : null;
}

export default function PacketDetailPanel({ packetId }: { packetId: string }) {
  const [packet, setPacket] = useState<ApplicationPacketView | undefined>(undefined);
  const [verifiedFactsText, setVerifiedFactsText] = useState("");
  const [resumeDraft, setResumeDraft] = useState<Record<string, unknown> | undefined>(undefined);
  const [resumeVersionId, setResumeVersionId] = useState<string | undefined>(undefined);
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("Loading packet...");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  async function refreshPacket() {
    setErrorMessage(undefined);
    const response = await fetch(`/api/application-packets/${encodeURIComponent(packetId)}`, { cache: "no-store" });
    const body = await readJson(response);
    const parsed = applicationPacketFromEnvelope(body);
    if (!response.ok || !parsed) throw new Error("Application packet not found.");
    setPacket(parsed);
    setStatusMessage(`Loaded packet: ${APPLICATION_PACKET_STATUS_LABELS[parsed.status]}.`);
  }

  useEffect(() => {
    void refreshPacket().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Could not load packet.");
      setStatusMessage("Packet load failed.");
    });
  }, [packetId]);

  async function runPacketAction(action: () => Promise<void>, loadingMessage: string) {
    setIsLoading(true);
    setErrorMessage(undefined);
    setStatusMessage(loadingMessage);
    try {
      await action();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Action failed.");
      setStatusMessage("Action failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function generatePlaceholders() {
    await runPacketAction(async () => {
      const response = await fetch(`/api/application-packets/${encodeURIComponent(packetId)}/generate-placeholders`, { method: "POST" });
      const body = await readJson(response);
      const parsed = applicationPacketFromEnvelope(body);
      if (!response.ok || !parsed) throw new Error("Draft generation failed.");
      setPacket(parsed);
      setStatusMessage("Drafts generated for human review. No email, upload, or submit action happened.");
    }, "Generating review-required packet drafts...");
  }

  async function markStatus(status: ApplicationPacketStatus) {
    await runPacketAction(async () => {
      const response = await fetch(`/api/application-packets/${encodeURIComponent(packetId)}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const body = await readJson(response);
      const parsed = applicationPacketFromEnvelope(body);
      if (!response.ok || !parsed) throw new Error("Status update failed.");
      setPacket(parsed);
      setStatusMessage(`Status updated: ${APPLICATION_PACKET_STATUS_LABELS[parsed.status]}.`);
    }, `Marking packet ${APPLICATION_PACKET_STATUS_LABELS[status]}...`);
  }

  async function generateResume() {
    if (!packet) return;
    await runPacketAction(async () => {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: packet.jobId,
          companyId: packet.companyId,
          applicationPacketId: packet.id,
          targetRole: packet.selectedJob.title,
          companyName: packet.selectedCompany?.name ?? packet.selectedJob.company,
          jobDescription: packet.selectedJob.description,
          verifiedFacts: stringArrayFromText(verifiedFactsText)
        })
      });
      const body = await readJson(response);
      const result = resultFromEnvelope(body);
      const draft = isRecord(result) && isRecord(result.draft) ? result.draft : undefined;
      const version = isRecord(result) && isRecord(result.resumeVersion) ? result.resumeVersion : undefined;
      const versionId = stringFrom(version?.id);
      if (!response.ok || !draft) throw new Error("Resume generation failed. Add verified Profile Facts or paste verified facts here.");
      setResumeDraft(draft);
      setResumeVersionId(versionId || undefined);
      setStatusMessage("Resume draft generated and truthfulness-checked. Export remains local-only.");
    }, "Generating truthfulness-guarded resume...");
  }

  async function exportResume(format: "markdown" | "docx") {
    if (!resumeVersionId && !resumeDraft) return;
    await runPacketAction(async () => {
      const response = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          format,
          resumeVersionId,
          resumeDraft
        })
      });
      const body = await readJson(response);
      const result = resultFromEnvelope(body);
      const nextDownloadUrl = isRecord(result) ? stringFrom(result.downloadUrl) : "";
      if (!response.ok || !nextDownloadUrl) throw new Error("Local document export failed.");
      setDownloadUrl(nextDownloadUrl);
      setStatusMessage(`${format.toUpperCase()} export created locally. No upload or submission happened.`);
    }, `Creating local ${format.toUpperCase()} export...`);
  }

  if (!packet) {
    return (
      <section className="section">
        <div className="card">
          <p className="muted" aria-live="polite">{statusMessage}</p>
          <ErrorMessage message={errorMessage} />
          <button type="button" onClick={() => void refreshPacket()}>Retry</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="section warning-card" aria-label="Manual-only packet safety">
        <h2>Safety contract</h2>
        <ul className="compact-list">
          <li>No auto-submit.</li>
          <li>No email send.</li>
          <li>No upload.</li>
          <li>No browser automation.</li>
          <li>Every draft is copyable text for human review only.</li>
        </ul>
      </section>

      <section className="section">
        <h2>{packet.selectedJob.title}</h2>
        <div className="grid">
          <div className="card">
            <strong>{packet.selectedCompany?.name ?? packet.selectedJob.company}</strong>
            <p className="muted">status: {APPLICATION_PACKET_STATUS_LABELS[packet.status]}</p>
            <p className="muted">next: {packet.nextAction}</p>
            <p className="muted">packet ID: {packet.id}</p>
            <p className="muted">job ID: {packet.jobId}</p>
            <p className="muted">company ID: {packet.companyId ?? "n/a"}</p>
            <p className="muted">{safetyLabelForPacket(packet)}</p>
            {packet.selectedJob.url ? <p><a href={packet.selectedJob.url} target="_blank" rel="noreferrer">Open saved source URL</a></p> : null}
          </div>
          <div className="card">
            <strong>Fit summary</strong>
            <p className="muted">score: {packet.fitScoreSummary.score}/100</p>
            <p className="muted">segment: {packet.fitScoreSummary.segment}</p>
            <p className="muted">highlights: {packet.fitScoreSummary.highlights.join(", ") || "n/a"}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Packet actions</h2>
        <div className="card form-card">
          <div className="button-row">
            <button type="button" disabled={isLoading} onClick={() => void generatePlaceholders()}>Generate packet drafts</button>
            <button type="button" disabled={isLoading} onClick={() => void markStatus("awaiting_review")}>Mark awaiting review</button>
            <button type="button" disabled={isLoading} onClick={() => void markStatus("ready_to_apply")}>Mark ready to apply</button>
            <button type="button" disabled={isLoading} onClick={() => void markStatus("submitted")}>Mark submitted manually</button>
            <button type="button" disabled={isLoading} onClick={() => void markStatus("closed")}>Mark closed</button>
            <button type="button" disabled={isLoading} onClick={() => void refreshPacket()}>Refresh</button>
          </div>
          <p className="muted" aria-live="polite">{statusMessage}</p>
          <ErrorMessage message={errorMessage} />
        </div>
      </section>

      <section className="section">
        <h2>Copyable drafts</h2>
        <div className="card form-card">
          <DraftTextarea label="Resume draft brief" value={packet.resumePlaceholder} />
          <DraftTextarea label="Cover letter draft" value={packet.coverLetterPlaceholder} />
          <DraftTextarea label="Recruiter message draft" value={packet.recruiterMessagePlaceholder} />
        </div>
      </section>

      <section className="section">
        <h2>Resume + local export</h2>
        <div className="card form-card">
          <p className="muted">Paste verified facts here, one per line. If left empty, Resume Factory uses approved Profile Facts for this user; it will reject unsupported claims.</p>
          <label>Verified facts<textarea rows={7} value={verifiedFactsText} onChange={(event) => setVerifiedFactsText(event.target.value)} placeholder="Built Splunk SIEM dashboards..." /></label>
          <div className="button-row">
            <button type="button" disabled={isLoading} onClick={() => void generateResume()}>Generate truthfulness-guarded resume</button>
            <button type="button" disabled={isLoading || (!resumeVersionId && !resumeDraft)} onClick={() => void exportResume("markdown")}>Export Markdown locally</button>
            <button type="button" disabled={isLoading || (!resumeVersionId && !resumeDraft)} onClick={() => void exportResume("docx")}>Export DOCX locally</button>
          </div>
          {resumeVersionId ? <p className="muted">resume version ID: {resumeVersionId}</p> : null}
          {downloadUrl ? <p><a href={downloadUrl}>Download latest local export</a></p> : null}
        </div>
      </section>
    </>
  );
}

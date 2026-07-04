"use client";

import type { ApplicationPacketRecord } from "@career-os/domains";
import { useState } from "react";
import { buildPacketResumePayload, packetResumeResultFromEnvelope, type PacketResumeResultView } from "./packet-resume-action-model";

export default function PacketResumeAction({ packet }: { packet: ApplicationPacketRecord }) {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to generate a resume draft for this application.");
  const [result, setResult] = useState<PacketResumeResultView | undefined>(undefined);

  async function generateResume() {
    const payload = buildPacketResumePayload(packet);
    setIsLoading(true);
    setStatusMessage("Generating resume draft for this application only...");
    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));
      const parsed = packetResumeResultFromEnvelope(body);
      setResult(parsed);
      setStatusMessage(!response.ok || parsed.errorMessage ? parsed.errorMessage ?? "Resume generation failed." : "Resume draft generated for local review only.");
    } catch (error) {
      setResult({ truthfulnessNotes: [], warnings: [], errorMessage: error instanceof Error ? error.message : "Unknown network error." });
      setStatusMessage("Network/runtime error while generating the packet resume.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section">
      <h2>Resume Draft for This Application</h2>
      <div className="card form-card">
        <p className="muted">This draft uses saved resume facts, blocks unsupported claims, and performs no external submission.</p>
        <button type="button" disabled={isLoading} onClick={() => void generateResume()}>
          {isLoading ? "Generating…" : "Generate Resume Draft"}
        </button>
        <p className="muted" aria-live="polite">{statusMessage}</p>
      </div>

      {result ? (
        <div className="grid">
          <div className="card"><strong>Draft ID</strong><p className="muted">{result.draftId ?? "n/a"}</p></div>
          <div className="card"><strong>Resume safety check</strong><p className="muted">{result.guardOk ? "passed" : "blocked or unavailable"}</p></div>
          <div className="card"><strong>Source record</strong><p className="muted">{result.sourceSnapshotId ?? "n/a"}</p></div>
          <div className="card"><strong>Resume facts used</strong><p className="muted">{result.usedFactCount ?? 0}</p></div>
          <div className="card"><strong>Blocked unsupported claims</strong><p className="muted">{result.blockedClaimCount ?? 0}</p></div>
          <div className="card"><strong>Needs proof excluded</strong><p className="muted">{result.needsEvidenceExclusionCount ?? 0}</p></div>
          <div className="card">
            <strong>Export</strong>
            {result.draftId ? <p><a href={`/api/application-packets/${packet.id}/resume/export`}>Export Resume Draft</a></p> : <p className="muted">Generate a draft before exporting.</p>}
          </div>
          <div className="card">
            <strong>Resume safety notes</strong>
            {result.truthfulnessNotes.length > 0 ? <ul className="compact-list">{result.truthfulnessNotes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="muted">No truthfulness notes returned.</p>}
          </div>
          <div className="card">
            <strong>Warnings</strong>
            {result.warnings.length > 0 ? <ul className="compact-list">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p className="muted">No warnings returned.</p>}
          </div>
        </div>
      ) : null}
    </section>
  );
}

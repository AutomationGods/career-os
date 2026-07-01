"use client";

import type { ApplicationPacketRecord } from "@career-os/domains";
import { useState } from "react";
import { buildPacketResumePayload, packetResumeResultFromEnvelope, type PacketResumeResultView } from "./packet-resume-action-model";

const defaultFacts = "";

export default function PacketResumeAction({ packet }: { packet: ApplicationPacketRecord }) {
  const [verifiedFactsText, setVerifiedFactsText] = useState(defaultFacts);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to generate a packet-specific grounded resume draft.");
  const [result, setResult] = useState<PacketResumeResultView | undefined>(undefined);

  async function generateResume() {
    const payload = buildPacketResumePayload(packet, verifiedFactsText);
    if (payload.verifiedFacts.length === 0) {
      setStatusMessage("Add at least one verified fact first. Resume Factory will not invent content.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Generating grounded resume draft for this packet only...");
    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => ({}));
      const parsed = packetResumeResultFromEnvelope(body);
      setResult(parsed);
      setStatusMessage(!response.ok || parsed.errorMessage ? parsed.errorMessage ?? "Resume generation failed." : "Grounded draft generated for local review only.");
    } catch (error) {
      setResult({ warnings: [], errorMessage: error instanceof Error ? error.message : "Unknown network error." });
      setStatusMessage("Network/runtime error while generating the packet resume.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section">
      <h2>Grounded Resume for This Packet</h2>
      <div className="card form-card">
        <p className="muted">Paste only facts you can verify, one per line. The resume command blocks unsupported claims and performs no external submission.</p>
        <label>
          Verified facts
          <textarea rows={7} value={verifiedFactsText} onChange={(event) => setVerifiedFactsText(event.target.value)} />
        </label>
        <button type="button" disabled={isLoading} onClick={() => void generateResume()}>
          {isLoading ? "Generating…" : "Generate grounded resume"}
        </button>
        <p className="muted" aria-live="polite">{statusMessage}</p>
      </div>

      {result ? (
        <div className="grid">
          <div className="card"><strong>Draft ID</strong><p className="muted">{result.draftId ?? "n/a"}</p></div>
          <div className="card"><strong>Truthfulness guard</strong><p className="muted">{result.guardOk ? "passed" : "blocked or unavailable"}</p></div>
          <div className="card"><strong>Source snapshot</strong><p className="muted">{result.sourceSnapshotId ?? "n/a"}</p></div>
          <div className="card">
            <strong>Local export</strong>
            {result.draftId ? <p><a href={`/api/application-packets/${packet.id}/resume/export`}>Download markdown</a></p> : <p className="muted">Generate a draft before exporting.</p>}
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

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SAMPLE_MASTER_RESUME_TEXT,
  countReviewQueueByStatus,
  masterResumeResultFromEnvelope,
  type MasterResumeResultView
} from "./master-resume-model";
import type { ProfileFactView } from "../profile-facts/profile-facts-model";

type ApiErrorEnvelope = { error?: { code?: unknown; message?: unknown }; command?: { id?: unknown; status?: unknown } };

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function apiErrorMessage(body: unknown, fallback: string) {
  if (!isApiErrorEnvelope(body) || !body.error || typeof body.error !== "object") return fallback;
  const code = typeof body.error.code === "string" ? body.error.code : "REQUEST_FAILED";
  const message = typeof body.error.message === "string" ? body.error.message : fallback;
  const commandStatus = isApiErrorEnvelope(body.command) && typeof body.command.status === "string" ? ` commandStatus=${body.command.status}` : "";
  return `${code}: ${message}${commandStatus}`;
}

function SummaryCards({ result }: { result?: MasterResumeResultView }) {
  const summary = countReviewQueueByStatus(result?.reviewQueue ?? []);
  return (
    <div className="grid">
      <div className="card"><strong>{result?.masterResume?.stats.candidateFactCount ?? 0}</strong><p className="muted">parsed candidate facts</p></div>
      <div className="card"><strong>{result?.candidateFacts.length ?? 0}</strong><p className="muted">new needs-review facts</p></div>
      <div className="card"><strong>{summary.needsReview}</strong><p className="muted">review queue items</p></div>
      <div className="card"><strong>{result?.skippedCandidates.length ?? 0}</strong><p className="muted">skipped existing/blocked</p></div>
    </div>
  );
}

function FactReviewCard({ fact, disabled, onVerify, onBlock }: { fact: ProfileFactView; disabled: boolean; onVerify: (fact: ProfileFactView) => void; onBlock: (fact: ProfileFactView) => void }) {
  return (
    <div className="card">
      <strong>{fact.label}</strong>
      <p className="muted">factType: {fact.factType}</p>
      <p className="muted">category: {fact.category ?? "n/a"}</p>
      <p className="muted">sourceType: {fact.sourceType}</p>
      <p className="muted">verificationStatus: {fact.verificationStatus}</p>
      <p className="muted">allowedInResume: {String(fact.allowedInResume)}</p>
      <p className="muted">requiresReview: {String(fact.requiresReview)}</p>
      <div className="button-row">
        <button type="button" disabled={disabled || fact.verificationStatus === "verified" || fact.isBlocked} onClick={() => onVerify(fact)}>Verify</button>
        <button type="button" disabled={disabled || fact.isBlocked} onClick={() => onBlock(fact)}>Block</button>
      </div>
    </div>
  );
}

export default function MasterResumePanel() {
  const [resumeText, setResumeText] = useState(SAMPLE_MASTER_RESUME_TEXT);
  const [result, setResult] = useState<MasterResumeResultView | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("Ready to import pasted plain-text resume data.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const parsedCandidates = result?.masterResume?.candidateFacts ?? [];
  const reviewQueue = result?.reviewQueue ?? [];
  const importedAt = useMemo(() => result?.masterResume?.importedAt ? new Date(result.masterResume.importedAt).toLocaleString() : "n/a", [result?.masterResume?.importedAt]);

  useEffect(() => {
    void refreshMasterResume().catch(() => undefined);
  }, []);

  async function refreshMasterResume() {
    const response = await fetch("/api/master-resume", { cache: "no-store" });
    const body = await readJson(response);
    if (!response.ok) throw new Error(apiErrorMessage(body, "Could not load Master Resume."));
    setResult(masterResumeResultFromEnvelope(body));
  }

  async function importResume() {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Importing Master Resume and applying safety blocks through the Command Bus...");
    try {
      const response = await fetch("/api/master-resume/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeText, source: "pasted_plain_text" })
      });
      const body = await readJson(response);
      const parsedResult = masterResumeResultFromEnvelope(body);
      setResult(parsedResult);
      if (!response.ok || parsedResult.errorMessage) throw new Error(parsedResult.errorMessage ?? apiErrorMessage(body, "Could not import Master Resume."));
      setStatusMessage("Master Resume imported. Candidate facts are in needs_review and are not resume-allowed yet.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown import failure.");
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyFact(fact: ProfileFactView) {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(`Verifying candidate fact: ${fact.label}`);
    try {
      const response = await fetch(`/api/profile-facts/${encodeURIComponent(fact.id)}/verify`, { method: "POST" });
      const body = await readJson(response);
      if (!response.ok) throw new Error(apiErrorMessage(body, "Could not verify fact."));
      await refreshMasterResume();
      setStatusMessage(`Verified fact: ${fact.label}. It can now be used by Resume Factory.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown verify failure.");
    } finally {
      setIsLoading(false);
    }
  }

  async function blockFact(fact: ProfileFactView) {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(`Blocking unsupported candidate fact: ${fact.label}`);
    try {
      const response = await fetch(`/api/profile-facts/${encodeURIComponent(fact.id)}/block`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: fact.label, factType: fact.factType, blockedReason: "Blocked during Master Resume review." })
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(apiErrorMessage(body, "Could not block fact."));
      await refreshMasterResume();
      setStatusMessage(`Blocked fact: ${fact.label}. Blocked claims shadow duplicate candidates.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown block failure.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <SummaryCards result={result} />

      <section className="section warning-card" aria-label="Truthfulness warning">
        <h2>Truthfulness Contract</h2>
        <ul className="compact-list">
          <li>Imported facts start as needs_review and allowedInResume=false.</li>
          <li>Resume Factory uses verified Profile Facts only.</li>
          <li>CISSP, Security+, and clearance claims are safety-blocked during import.</li>
        </ul>
      </section>

      <section className="section">
        <h2>Import Plain Text</h2>
        <div className="card form-card">
          <label>
            Paste master resume text
            <textarea rows={14} value={resumeText} onChange={(event) => setResumeText(event.target.value)} />
          </label>
          <div className="button-row">
            <button type="button" disabled={isLoading} onClick={() => void importResume()}>Import + Safety Blocks</button>
            <button type="button" disabled={isLoading} onClick={() => void refreshMasterResume()}>Refresh</button>
          </div>
          <p className="muted" aria-live="polite">{statusMessage}</p>
          {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        </div>
      </section>

      <section className="section">
        <h2>Current Import</h2>
        {result?.masterResume ? (
          <div className="grid">
            <div className="card"><strong>Master Resume ID</strong><p className="muted">{result.masterResume.id}</p></div>
            <div className="card"><strong>Imported at</strong><p className="muted">{importedAt}</p></div>
            <div className="card"><strong>Parser</strong><p className="muted">{result.masterResume.parseVersion}</p></div>
            <div className="card"><strong>Source snapshot</strong><p className="muted">{result.sourceSnapshotId ?? "see latest import event"}</p></div>
          </div>
        ) : <div className="card">No Master Resume import found yet.</div>}
      </section>

      <section className="section">
        <h2>Parsed Candidate Facts</h2>
        <div className="grid">
          {parsedCandidates.map((fact) => (
            <div className="card" key={`${fact.factType}:${fact.label}`}>
              <strong>{fact.label}</strong>
              <p className="muted">factType: {fact.factType}</p>
              <p className="muted">category: {fact.category ?? "n/a"}</p>
              <p className="muted">confidence: {fact.confidence}</p>
              <p className="muted">evidence: {fact.evidence ?? "n/a"}</p>
              <p className="muted">default: needs_review, not resume-allowed</p>
            </div>
          ))}
          {parsedCandidates.length === 0 ? <div className="card">No deterministic candidate facts parsed yet.</div> : null}
        </div>
      </section>

      <section className="section">
        <h2>Review Queue</h2>
        <div className="grid">
          {reviewQueue.map((fact) => <FactReviewCard key={fact.id} fact={fact} disabled={isLoading} onVerify={verifyFact} onBlock={blockFact} />)}
          {reviewQueue.length === 0 ? <div className="card">No needs-review facts are waiting.</div> : null}
        </div>
      </section>

      <section className="section">
        <h2>Skipped Candidates</h2>
        <div className="grid">
          {(result?.skippedCandidates ?? []).map((candidate) => (
            <div className="card" key={`${candidate.factType}:${candidate.label}:${candidate.reason}`}>
              <strong>{candidate.label}</strong>
              <p className="muted">factType: {candidate.factType}</p>
              <p className="muted">reason: {candidate.reason}</p>
            </div>
          ))}
          {(result?.skippedCandidates.length ?? 0) === 0 ? <div className="card">No skipped candidates yet.</div> : null}
        </div>
      </section>
    </>
  );
}

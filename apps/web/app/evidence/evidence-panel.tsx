"use client";

import { useEffect, useMemo, useState } from "react";
import { getJson } from "../career-command/fetch-json";
import { buildEvidenceReview, type EvidenceClaimView, type EvidenceDocumentView, type EvidenceFactView, type MissingEvidenceView } from "./evidence-review-model";

type UnknownRecord = Record<string, unknown>;

function CountCard({ label, value }: { label: string; value: number }) {
  return <div className="card"><strong>{value}</strong><p className="muted">{label}</p></div>;
}

function EmptyState({ children }: { children: string }) {
  return <p className="muted">{children}</p>;
}

function DocumentCard({ document }: { document: EvidenceDocumentView }) {
  return (
    <div className="card">
      <strong>{document.title}</strong>
      <p className="muted">{document.kind} · {document.filename}</p>
      <p>{document.preview}</p>
      <p className="muted">Saved: {document.importedAt}</p>
    </div>
  );
}

function ClaimCard({ claim }: { claim: EvidenceClaimView }) {
  return (
    <div className="card">
      <strong>{claim.claim}</strong>
      <p className="muted">{claim.kind} · {claim.confidence}</p>
      <p>{claim.evidence}</p>
    </div>
  );
}

function FactCard({ fact }: { fact: EvidenceFactView }) {
  return (
    <div className="card">
      <strong>{fact.claim}</strong>
      <p className="muted">{fact.kind} · {fact.status}</p>
      <p>{fact.evidence}</p>
      <p className="muted">{fact.reason}</p>
    </div>
  );
}

function MissingEvidenceCard({ item }: { item: MissingEvidenceView }) {
  return (
    <div className="card">
      <strong>{item.item}</strong>
      <p className="muted">{item.reason}</p>
    </div>
  );
}

export default function EvidencePanel() {
  const [status, setStatus] = useState<UnknownRecord | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Loading evidence review...");
  const review = useMemo(() => buildEvidenceReview(status), [status]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const nextStatus = await getJson<UnknownRecord>("/api/career-command/status");
      if (!isMounted) return;
      if (!nextStatus) {
        setMessage("Could not load saved evidence. Refresh and try again.");
        setIsLoading(false);
        return;
      }
      setStatus(nextStatus);
      setMessage("Read-only review loaded.");
      setIsLoading(false);
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="main">
      <span className="badge">Read-only</span>
      <h1>Evidence Review</h1>
      <p className="muted">See what Career OS saved from your resume, what can safely appear in resume drafts, and what still needs proof.</p>
      <p className="muted" aria-live="polite">{message}</p>

      <section className="section">
        <div className="grid">
          <CountCard label="Uploaded documents" value={review.counts.documents} />
          <CountCard label="Extracted claims" value={review.counts.extractedClaims} />
          <CountCard label="Saved facts" value={review.counts.profileFacts} />
          <CountCard label="Resume-ready facts" value={review.counts.resumeAllowedFacts} />
          <CountCard label="Kept out of resumes" value={review.counts.blockedPrivateFacts} />
          <CountCard label="Need proof" value={review.counts.missingEvidence} />
        </div>
      </section>

      <section className="section">
        <h2>Imported documents</h2>
        <div className="grid">
          {review.documents.length > 0 ? review.documents.map((document) => <DocumentCard document={document} key={document.id} />) : <EmptyState>{isLoading ? "Loading documents..." : "No documents uploaded yet."}</EmptyState>}
        </div>
      </section>

      <section className="section">
        <h2>Extracted claims</h2>
        <p className="muted">These are statements Career OS found in your uploaded material.</p>
        <div className="grid">
          {review.extractedClaims.length > 0 ? review.extractedClaims.map((claim) => <ClaimCard claim={claim} key={claim.id} />) : <EmptyState>{isLoading ? "Loading claims..." : "No claims extracted yet."}</EmptyState>}
        </div>
      </section>

      <section className="section">
        <h2>Saved facts</h2>
        <p className="muted">These are the facts Career OS can use after reviewing your uploaded material.</p>
        <div className="grid">
          {review.profileFacts.length > 0 ? review.profileFacts.map((fact) => <FactCard fact={fact} key={fact.id} />) : <EmptyState>{isLoading ? "Loading facts..." : "No saved facts yet."}</EmptyState>}
        </div>
      </section>

      <section className="section">
        <h2>Resume-ready facts</h2>
        <p className="muted">These facts are currently safe for generated resume drafts.</p>
        <div className="grid">
          {review.resumeAllowedFacts.length > 0 ? review.resumeAllowedFacts.map((fact) => <FactCard fact={fact} key={fact.id} />) : <EmptyState>{isLoading ? "Loading resume-ready facts..." : "No resume-ready facts yet."}</EmptyState>}
        </div>
      </section>

      <section className="section">
        <h2>Kept out of resumes</h2>
        <p className="muted">These items are private, unconfirmed, or blocked from resume drafts until reviewed.</p>
        <div className="grid">
          {review.blockedPrivateFacts.length > 0 ? review.blockedPrivateFacts.map((fact) => <FactCard fact={fact} key={fact.id} />) : <EmptyState>{isLoading ? "Loading blocked items..." : "No blocked or private facts saved."}</EmptyState>}
        </div>
      </section>

      <section className="section">
        <h2>Missing evidence</h2>
        <p className="muted">Gather these proofs to make future job matches and resume drafts stronger.</p>
        <div className="grid">
          {review.missingEvidence.length > 0 ? review.missingEvidence.map((item) => <MissingEvidenceCard item={item} key={item.id} />) : <EmptyState>{isLoading ? "Loading proof gaps..." : "No missing evidence flagged yet."}</EmptyState>}
        </div>
      </section>
    </main>
  );
}

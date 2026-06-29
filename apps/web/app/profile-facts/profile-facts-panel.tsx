"use client";

import { useEffect, useMemo, useState } from "react";
import {
  blockedReasonText,
  countProfileFacts,
  filterProfileFacts,
  profileFactFromEnvelope,
  profileFactsFromEnvelope,
  type ProfileFactFilter,
  type ProfileFactView
} from "./profile-facts-model";

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

function SummaryCards({ facts }: { facts: ProfileFactView[] }) {
  const summary = countProfileFacts(facts);
  return (
    <div className="grid">
      <div className="card"><strong>{summary.verifiedFacts}</strong><p className="muted">verified facts</p></div>
      <div className="card"><strong>{summary.blockedClaims}</strong><p className="muted">blocked claims</p></div>
      <div className="card"><strong>{summary.needsReview}</strong><p className="muted">needs review</p></div>
      <div className="card"><strong>{summary.resumeAllowedFacts}</strong><p className="muted">resume-allowed facts</p></div>
    </div>
  );
}

const filters: Array<{ label: string; value: ProfileFactFilter }> = [
  { label: "All", value: "all" },
  { label: "Verified", value: "verified" },
  { label: "Needs Review", value: "needs_review" },
  { label: "Blocked", value: "blocked" },
  { label: "Resume Allowed", value: "resume_allowed" }
];

export default function ProfileFactsPanel() {
  const [facts, setFacts] = useState<ProfileFactView[]>([]);
  const [filter, setFilter] = useState<ProfileFactFilter>("all");
  const [statusMessage, setStatusMessage] = useState("Ready to load or seed Profile Facts.");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addLabel, setAddLabel] = useState("Splunk data onboarding");
  const [addFactType, setAddFactType] = useState("skill");
  const [blockLabel, setBlockLabel] = useState("CISSP");
  const [blockReason, setBlockReason] = useState("User does not have this certification.");

  const visibleFacts = useMemo(() => filterProfileFacts(facts, filter), [facts, filter]);

  useEffect(() => {
    void refreshFacts().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Unknown load failure.");
    });
  }, []);

  async function refreshFacts() {
    const response = await fetch("/api/profile-facts?filter=all", { cache: "no-store" });
    const body = await readJson(response);
    if (!response.ok) throw new Error(apiErrorMessage(body, "Could not load Profile Facts."));
    setFacts(profileFactsFromEnvelope(body));
  }

  async function seedInitialFacts() {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Seeding initial verified and blocked facts through the Command Bus...");
    try {
      const response = await fetch("/api/profile-facts/seed-initial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(apiErrorMessage(body, "Could not seed Profile Facts."));
      await refreshFacts();
      setStatusMessage("Initial Profile Facts seeded. Verified facts and blocked claims are visible below.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown seed failure.");
    } finally {
      setIsLoading(false);
    }
  }

  async function addFact() {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Adding verified profile fact...");
    try {
      const response = await fetch("/api/profile-facts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          factType: addFactType,
          category: addFactType,
          label: addLabel,
          value: addLabel,
          sourceType: "manual",
          verificationStatus: "verified",
          allowedInResume: true,
          allowedInCoverLetter: true,
          allowedInRecruiterMessage: true,
          requiresReview: false
        })
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(apiErrorMessage(body, "Could not add Profile Fact."));
      const fact = profileFactFromEnvelope(body);
      if (fact) setFacts((current) => [...current.filter((item) => item.id !== fact.id), fact].sort((a, b) => a.label.localeCompare(b.label)));
      else await refreshFacts();
      setStatusMessage(`Added verified fact: ${addLabel}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown add failure.");
    } finally {
      setIsLoading(false);
    }
  }

  async function blockClaim() {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage("Blocking unsupported claim...");
    try {
      const response = await fetch("/api/profile-facts/manual-block/block", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: blockLabel, blockedReason: blockReason })
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(apiErrorMessage(body, "Could not block claim."));
      await refreshFacts();
      setStatusMessage(`Blocked claim: ${blockLabel}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown block failure.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <SummaryCards facts={facts} />

      <section className="section">
        <h2>Controls</h2>
        <div className="grid">
          <div className="card form-card">
            <strong>Seed Initial Profile Facts</strong>
            <p className="muted">Adds verified Splunk, Cribl, DevOps, SIEM, cloud, Linux, Terraform, and observability facts plus blocked CISSP, Security+, and clearance claims.</p>
            <button type="button" disabled={isLoading} onClick={() => void seedInitialFacts()}>Seed Initial Profile Facts</button>
          </div>
          <div className="card form-card">
            <strong>Add Fact</strong>
            <label>Label<input value={addLabel} onChange={(event) => setAddLabel(event.target.value)} /></label>
            <label>Fact type<input value={addFactType} onChange={(event) => setAddFactType(event.target.value)} /></label>
            <button type="button" disabled={isLoading} onClick={() => void addFact()}>Add Fact</button>
          </div>
          <div className="card form-card">
            <strong>Block Claim</strong>
            <label>Label<input value={blockLabel} onChange={(event) => setBlockLabel(event.target.value)} /></label>
            <label>Blocked reason<input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} /></label>
            <button type="button" disabled={isLoading} onClick={() => void blockClaim()}>Block Claim</button>
          </div>
        </div>
        <p className="muted" aria-live="polite">{statusMessage}</p>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      </section>

      <section className="section">
        <h2>Filters</h2>
        <div className="grid">
          {filters.map((item) => <button type="button" key={item.value} disabled={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
        </div>
      </section>

      <section className="section">
        <h2>Fact list</h2>
        <div className="grid">
          {visibleFacts.map((fact) => (
            <div className="card" key={fact.id}>
              <strong>{fact.label}</strong>
              <p className="muted">factType: {fact.factType}</p>
              <p className="muted">category: {fact.category ?? "n/a"}</p>
              <p className="muted">verificationStatus: {fact.verificationStatus}</p>
              <p className="muted">allowedInResume: {String(fact.allowedInResume)}</p>
              <p className="muted">allowedInCoverLetter: {String(fact.allowedInCoverLetter)}</p>
              <p className="muted">allowedInRecruiterMessage: {String(fact.allowedInRecruiterMessage)}</p>
              <p className="muted">isBlocked: {String(fact.isBlocked)}</p>
              <p className="muted">blockedReason: {blockedReasonText(fact) || "n/a"}</p>
              <p className="muted">sourceType: {fact.sourceType}</p>
              <p className="muted">confidence: {fact.confidence}</p>
            </div>
          ))}
          {visibleFacts.length === 0 ? <div className="card">No Profile Facts match this filter yet.</div> : null}
        </div>
      </section>
    </>
  );
}

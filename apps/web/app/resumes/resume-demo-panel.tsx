"use client";

import { useMemo, useState } from "react";
import {
  DEMO_COMPANY_NAME,
  DEMO_JOB_DESCRIPTION,
  DEMO_TARGET_ROLE,
  SAFETY_WARNINGS,
  buildKeywordAlignment,
  buildResumeDemoPayload,
  resumeResultFromEnvelope,
  uniqueStrings,
  type KeywordAlignmentView,
  type ResumeDemoFields,
  type ResumeDemoPayload,
  type ResumeResultView
} from "./resume-demo-panel-model";

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function ListCard({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="card">
      <strong>{title}</strong>
      {items.length > 0 ? (
        <ul className="compact-list">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </div>
  );
}

function SafetyWarning() {
  return (
    <section className="section warning-card" aria-label="Safety warning">
      <h2>Safety Warning</h2>
      <ul className="compact-list">
        {SAFETY_WARNINGS.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </section>
  );
}

function LatestResult({ result, latestPayload }: { result?: ResumeResultView; latestPayload?: ResumeDemoPayload }) {
  if (!result) return <p className="muted">No demo resume generated yet. For real workflows, open an application packet and generate from packet detail.</p>;

  return (
    <div className="grid">
      <div className="card">
        <strong>Command status</strong>
        <p className="muted">{result.commandStatus ?? "unknown"}</p>
      </div>
      <div className="card">
        <strong>Resume version ID</strong>
        <p className="muted">{result.draft?.resumeVersionId ?? latestPayload?.resumeVersionId ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Draft ID</strong>
        <p className="muted">{result.draft?.id ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Target role</strong>
        <p className="muted">{latestPayload?.targetRole ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Template key</strong>
        <p className="muted">technical-resume-v1</p>
      </div>
      <div className="card">
        <strong>Truthfulness status</strong>
        <p className="muted">{result.guard?.ok ? "passed" : "blocked or unavailable"}</p>
      </div>
      <div className="card">
        <strong>Source snapshot</strong>
        <p className="muted">{result.sourceSnapshotId ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Profile Facts consumption</strong>
        <p className="muted">{result.generatedFromProfileFacts ? "profile_facts.current" : "not reported"}</p>
      </div>
      <div className="card">
        <strong>Used facts</strong>
        <p className="muted">{result.truthfulnessSummary?.usedFactCount ?? result.usedFactIds.length}</p>
      </div>
      <div className="card">
        <strong>Blocked claims</strong>
        <p className="muted">{result.truthfulnessSummary?.blockedClaimCount ?? result.blockedFactIds.length}</p>
      </div>
      <div className="card">
        <strong>Needs-evidence excluded</strong>
        <p className="muted">{result.truthfulnessSummary?.needsEvidenceExclusionCount ?? result.needsEvidenceFactIds.length}</p>
      </div>
    </div>
  );
}

function KeywordAlignment({ alignment }: { alignment: KeywordAlignmentView }) {
  return (
    <div className="grid">
      <ListCard title="Verified matches" items={alignment.verifiedMatches} emptyText="No verified keyword matches yet." />
      <ListCard title="Related matches" items={alignment.partialMatches} emptyText="No related keyword matches in this demo response." />
      <ListCard title="Missing keywords" items={alignment.missingKeywords} emptyText="No missing keywords found." />
      <ListCard title="Blocked from being claimed" items={alignment.blockedKeywords} emptyText="No blocked terms found." />
    </div>
  );
}

function TruthfulnessGuard({ result }: { result?: ResumeResultView }) {
  const guard = result?.guard;
  return (
    <div className="grid">
      <div className="card">
        <strong>Status</strong>
        <p className="muted">{guard ? (guard.ok ? "Passed: every draft bullet matched a verified fact." : "Blocked: unsupported claims detected.") : "Awaiting generation."}</p>
      </div>
      <ListCard title="Blocked claims" items={guard?.blockedClaims ?? []} emptyText="No blocked claims reported." />
      <ListCard title="Warnings" items={uniqueStrings([...(result?.warnings ?? []), ...(guard?.warnings ?? [])])} emptyText="No warnings returned yet." />
      <ListCard title="Grounded claims" items={uniqueStrings(guard?.groundedClaims ?? [])} emptyText="No grounded claims returned yet." />
      <ListCard title="Scaffold placeholders" items={uniqueStrings(guard?.placeholderClaims ?? [])} emptyText="No placeholders returned yet." />
    </div>
  );
}

function TruthfulnessSummary({ result }: { result?: ResumeResultView }) {
  const summary = result?.truthfulnessSummary;
  if (!summary) return <p className="muted">Truthfulness summary will appear after generation.</p>;

  return (
    <div className="grid">
      <div className="card"><strong>Source of truth</strong><p className="muted">{summary.generatedFromProfileFacts ? "profile_facts.current" : "unknown"}</p></div>
      <div className="card"><strong>Profile facts loaded</strong><p className="muted">{summary.profileFactsLoaded}</p></div>
      <div className="card"><strong>Used facts</strong><p className="muted">{summary.usedFactCount}</p></div>
      <div className="card"><strong>Blocked claims</strong><p className="muted">{summary.blockedClaimCount}</p></div>
      <div className="card"><strong>Needs-evidence exclusions</strong><p className="muted">{summary.needsEvidenceExclusionCount}</p></div>
      <ListCard title="Missing required facts" items={summary.missingRequiredFacts} emptyText="No missing required facts reported." />
      <ListCard title="Truthfulness notes" items={summary.notes} emptyText="No truthfulness notes reported." />
    </div>
  );
}

function ResumePreview({ result, latestPayload, alignment }: { result?: ResumeResultView; latestPayload?: ResumeDemoPayload; alignment: KeywordAlignmentView }) {
  if (!result?.draft) return <div className="card"><p className="muted">Resume preview will appear here after generation.</p></div>;

  const verifiedFacts = uniqueStrings(result.draft.sourceFacts);
  const verifiedSkills = uniqueStrings(alignment.verifiedMatches);
  const technicalSkillNames = new Set(["splunk", "cribl", "siem", "linux", "terraform", "aws", "azure", "gcp"]);
  const technicalSkills = verifiedSkills.filter((skill) => technicalSkillNames.has(skill.toLowerCase()));
  const reviewNotes = uniqueStrings([...(result.warnings ?? []), ...(result.guard?.warnings ?? [])]);

  return (
    <div className="resume-preview">
      <header className="resume-header">
        <p className="resume-kicker">Target Title</p>
        <h3>{latestPayload?.targetRole ?? "Resume draft"}</h3>
        <p className="muted">Review-required draft assembled only from supplied verified facts.</p>
      </header>

      <section>
        <h4>Professional Summary</h4>
        <p>This local-review draft targets {latestPayload?.targetRole ?? "the selected role"} and only restates the verified facts listed in Experience Highlights.</p>
      </section>

      <section>
        <h4>Core Skills</h4>
        <p>{verifiedSkills.length > 0 ? verifiedSkills.join(" · ") : "No verified skills matched yet."}</p>
      </section>

      <section>
        <h4>Technical Skills</h4>
        <p>{technicalSkills.length > 0 ? technicalSkills.join(" · ") : "No verified technical skills matched yet."}</p>
      </section>

      <section>
        <h4>Experience Highlights</h4>
        <ul>
          {verifiedFacts.map((fact) => <li key={fact}>{fact}</li>)}
        </ul>
      </section>

      <section>
        <h4>Certifications</h4>
        <p>No verified certifications supplied. CISSP and Security+ are missing/preferred keywords, not claimed.</p>
      </section>

      <section>
        <h4>Review Notes</h4>
        <ul>
          {reviewNotes.map((note) => <li key={note}>{note}</li>)}
          <li>Clearance and fake employer, date, metric, and certification claims are blocked from being claimed.</li>
        </ul>
      </section>
    </div>
  );
}

export default function ResumeDemoPanel() {
  const [fields, setFields] = useState<ResumeDemoFields>({
    targetRole: DEMO_TARGET_ROLE,
    companyName: DEMO_COMPANY_NAME,
    jobDescription: DEMO_JOB_DESCRIPTION
  });
  const [latestPayload, setLatestPayload] = useState<ResumeDemoPayload | undefined>(undefined);
  const [result, setResult] = useState<ResumeResultView | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to generate a demo-only local review draft.");

  const alignment = useMemo(() => buildKeywordAlignment(latestPayload ?? buildResumeDemoPayload(fields), result), [fields, latestPayload, result]);

  function updateField(field: keyof ResumeDemoFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function generateDemoResume() {
    const payload = buildResumeDemoPayload(fields);
    setIsLoading(true);
    setLatestPayload(payload);
    setStatusMessage("Posting demo payload to /api/resumes through the existing Resume Factory command path...");

    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await readJson(response);
      const parsedResult = resumeResultFromEnvelope(body);
      setResult(parsedResult);

      if (!response.ok || parsedResult.errorMessage) {
        setStatusMessage(parsedResult.errorMessage ?? "Resume generation failed.");
        return;
      }

      setStatusMessage("Resume draft generated for local review only. No external action was taken.");
    } catch (error) {
      setResult({ reviewRequired: true, usedFactIds: [], blockedFactIds: [], needsEvidenceFactIds: [], warnings: [], errorCode: "NETWORK_ERROR", errorMessage: error instanceof Error ? error.message : "Unknown network error." });
      setStatusMessage("Network/runtime error while calling /api/resumes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <SafetyWarning />

      <section className="section">
        <h2>Secondary Demo Generator</h2>
        <p className="muted">Real resume generation now starts from Application Packets so job, company, packet, and export context stay linked.</p>
        <div className="card form-card">
          <label>
            Target role
            <input value={fields.targetRole} onChange={(event) => updateField("targetRole", event.target.value)} />
          </label>
          <label>
            Company name
            <input value={fields.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
          </label>
          <label>
            Job description
            <textarea rows={7} value={fields.jobDescription} onChange={(event) => updateField("jobDescription", event.target.value)} />
          </label>
          <button type="button" disabled={isLoading} onClick={() => void generateDemoResume()}>
            {isLoading ? "Generating Demo Resume..." : "Generate Demo Splunk/Cribl Resume"}
          </button>
          <p className="muted" aria-live="polite">{statusMessage}</p>
          {result?.errorMessage ? <p role="alert">{result.errorCode}: {result.errorMessage}</p> : null}
        </div>
      </section>

      <section className="section">
        <h2>Latest Result</h2>
        <LatestResult result={result} latestPayload={latestPayload} />
      </section>

      <section className="section">
        <h2>Keyword Alignment</h2>
        <KeywordAlignment alignment={alignment} />
      </section>

      <section className="section">
        <h2>Truthfulness Guard</h2>
        <TruthfulnessGuard result={result} />
      </section>

      <section className="section">
        <h2>Truthfulness Summary</h2>
        <TruthfulnessSummary result={result} />
      </section>

      <section className="section">
        <h2>Resume Preview</h2>
        <ResumePreview result={result} latestPayload={latestPayload} alignment={alignment} />
      </section>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_RESUME_TEMPLATE_KEY,
  DEFAULT_SECTION_ORDER,
  DOCUMENT_EXPORT_WARNING_TEXT,
  DEMO_COMPANY_NAME,
  DEMO_JOB_DESCRIPTION,
  DEMO_TARGET_ROLE,
  SAFETY_WARNINGS,
  buildKeywordAlignment,
  buildResumeDemoPayload,
  documentExportResultFromEnvelope,
  resumeResultFromEnvelope,
  resumeTemplatesFromEnvelope,
  uniqueStrings,
  type DocumentExportResultView,
  type KeywordAlignmentView,
  type ResumeDemoFields,
  type ResumeDemoPayload,
  type ResumeResultView,
  type ResumeTemplateView
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
  if (!result) return <p className="muted">No resume generated yet. Generate a local draft to call POST /api/resumes.</p>;

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
        <p className="muted">{result.draft?.templateKey ?? latestPayload?.templateKey ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Truthfulness status</strong>
        <p className="muted">{result.guard?.ok ? "passed" : "blocked or unavailable"}</p>
      </div>
      <div className="card">
        <strong>Persisted version</strong>
        <p className="muted">{result.resumeVersionId ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Source snapshot</strong>
        <p className="muted">{result.sourceSnapshotId ?? "n/a"}</p>
      </div>
    </div>
  );
}

function KeywordAlignment({ alignment }: { alignment: KeywordAlignmentView }) {
  return (
    <div className="grid">
      <ListCard title="Verified matches" items={alignment.verifiedMatches} emptyText="No verified keyword matches yet." />
      <ListCard title="Partial matches" items={alignment.partialMatches} emptyText="No partial matches in this demo response." />
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
      <ListCard title="Blocked claims" items={uniqueStrings([...(guard?.blockedClaims ?? []), ...(result?.blockedProfileClaims ?? [])])} emptyText="No blocked claims reported." />
      <ListCard title="Warnings" items={uniqueStrings([...(result?.warnings ?? []), ...(guard?.warnings ?? [])])} emptyText="No warnings returned yet." />
      <ListCard title="Grounded claims" items={uniqueStrings(guard?.groundedClaims ?? [])} emptyText="No grounded claims returned yet." />
    </div>
  );
}

function ReviewChecklist({ result }: { result?: ResumeResultView }) {
  const checklist = result?.draft?.reviewChecklist ?? [];
  return (
    <div className="grid">
      {checklist.map((item) => (
        <div className="card" key={item.id}>
          <strong>{item.label}</strong>
          <p className="muted">status: {item.status}</p>
          <p className="muted">{item.detail}</p>
        </div>
      ))}
      {checklist.length === 0 ? <div className="card"><p className="muted">Review checklist will appear after generation.</p></div> : null}
    </div>
  );
}

function ExportWorkspace({ result, exports, statusMessage, isExporting, onExport }: { result?: ResumeResultView; exports: DocumentExportResultView[]; statusMessage: string; isExporting: boolean; onExport: (format: "markdown" | "docx") => void }) {
  const canExport = Boolean(result?.draft && result.guard?.ok && result.resumeVersionId);
  return (
    <section className="section">
      <h2>Local Document Export</h2>
      <div className="card form-card">
        <strong>Export warning</strong>
        <p className="muted">{DOCUMENT_EXPORT_WARNING_TEXT}</p>
        <p className="muted">Exports are generated inside Career OS only. No email, upload, submit, or apply action is performed.</p>
        <div className="button-row">
          <button type="button" disabled={!canExport || isExporting} onClick={() => onExport("markdown")}>{isExporting ? "Exporting..." : "Export Markdown"}</button>
          <button type="button" disabled={!canExport || isExporting} onClick={() => onExport("docx")}>{isExporting ? "Exporting..." : "Export DOCX"}</button>
        </div>
        <p className="muted" aria-live="polite">{canExport ? statusMessage : "Generate a truthfulness-guarded resume before exporting."}</p>
      </div>
      <div className="grid">
        {exports.length > 0 ? exports.map((item) => (
          <div className="card" key={item.export?.id ?? item.commandId}>
            <strong>{item.export?.content?.filename ?? item.export?.id ?? "Document export"}</strong>
            <p className="muted">status: {item.errorMessage ? "failed" : item.commandStatus ?? "completed"}</p>
            <p className="muted">document export ID: {item.export?.id ?? "n/a"}</p>
            <p className="muted">local path: {item.export?.url ?? "stored in local DocumentExport records"}</p>
            <p className="muted">external action taken: {String(item.externalActionTaken)}</p>
            {item.downloadUrl ? <p><a href={item.downloadUrl}>Download {item.export?.format?.toUpperCase()}</a></p> : null}
            {item.errorMessage ? <p role="alert">{item.errorCode}: {item.errorMessage}</p> : null}
          </div>
        )) : <div className="card"><p className="muted">No document exports generated yet.</p></div>}
      </div>
    </section>
  );
}

function ResumePreview({ result, latestPayload }: { result?: ResumeResultView; latestPayload?: ResumeDemoPayload; alignment: KeywordAlignmentView }) {
  if (!result?.draft) return <div className="card"><p className="muted">Resume preview will appear here after generation.</p></div>;

  return (
    <div className="resume-preview">
      <header className="resume-header">
        <p className="resume-kicker">{result.draft.templateName ?? "ATS Technical v2"}</p>
        <h3>{latestPayload?.targetRole ?? "Resume draft"}</h3>
        <p className="muted">Review-required draft assembled only from verified Profile Facts.</p>
      </header>

      {result.draft.sections.map((section) => (
        <section key={section.key ?? section.title}>
          <h4>{section.title}</h4>
          <ul>
            {section.bullets.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
        </section>
      ))}

      <section>
        <h4>Blocked / Not Claimed</h4>
        <p>{result.blockedProfileClaims.length > 0 ? result.blockedProfileClaims.join(" · ") : "No blocked Profile Fact claims were supplied."}</p>
      </section>
    </div>
  );
}

export default function ResumeDemoPanel() {
  const [fields, setFields] = useState<ResumeDemoFields>({
    targetRole: DEMO_TARGET_ROLE,
    companyName: DEMO_COMPANY_NAME,
    jobDescription: DEMO_JOB_DESCRIPTION,
    templateKey: DEFAULT_RESUME_TEMPLATE_KEY,
    sectionOrder: DEFAULT_SECTION_ORDER
  });
  const [templates, setTemplates] = useState<ResumeTemplateView[]>([]);
  const [sectionOrderText, setSectionOrderText] = useState(DEFAULT_SECTION_ORDER.join(", "));
  const [latestPayload, setLatestPayload] = useState<ResumeDemoPayload | undefined>(undefined);
  const [result, setResult] = useState<ResumeResultView | undefined>(undefined);
  const [exports, setExports] = useState<DocumentExportResultView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to generate a local review draft.");
  const [exportStatusMessage, setExportStatusMessage] = useState("Ready to export local Markdown or DOCX after generation.");

  const alignment = useMemo(() => buildKeywordAlignment(latestPayload ?? buildResumeDemoPayload(fields), result), [fields, latestPayload, result]);

  useEffect(() => {
    void fetch("/api/resume-templates", { cache: "no-store" })
      .then(readJson)
      .then((body) => setTemplates(resumeTemplatesFromEnvelope(body)))
      .catch(() => setTemplates([]));
  }, []);

  function updateField(field: "targetRole" | "companyName" | "jobDescription" | "templateKey", value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function updateSectionOrder(value: string) {
    setSectionOrderText(value);
    setFields((current) => ({ ...current, sectionOrder: value.split(",").map((item) => item.trim()).filter(Boolean) }));
  }

  async function generateLocalResume() {
    const payload = buildResumeDemoPayload(fields);
    setIsLoading(true);
    setLatestPayload(payload);
    setStatusMessage("Posting your local draft request to /api/resumes through the existing Resume Factory command path...");

    try {
      const { verifiedFacts: _demoFactsForFallbackPreview, ...apiPayload } = payload;
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(apiPayload)
      });
      const body = await readJson(response);
      const parsedResult = resumeResultFromEnvelope(body);
      setResult(parsedResult);
      setExports([]);

      if (!response.ok || parsedResult.errorMessage) {
        setStatusMessage(parsedResult.errorMessage ?? "Resume generation failed.");
        return;
      }

      setStatusMessage("Resume draft generated for local review only. No external action was taken.");
    } catch (error) {
      setResult({ reviewRequired: true, warnings: [], blockedProfileClaims: [], errorCode: "NETWORK_ERROR", errorMessage: error instanceof Error ? error.message : "Unknown network error." });
      setStatusMessage("Network/runtime error while calling /api/resumes.");
    } finally {
      setIsLoading(false);
    }
  }

  async function exportResume(format: "markdown" | "docx") {
    if (!result?.draft) return;
    setIsExporting(true);
    setExportStatusMessage(`Exporting ${format.toUpperCase()} locally through the Document Export command path...`);

    try {
      const response = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resumeVersionId: result.resumeVersionId,
          resumeDraft: result.resumeVersionId ? undefined : result.draft,
          blockedProfileClaims: result.blockedProfileClaims,
          format
        })
      });
      const body = await readJson(response);
      const parsedResult = documentExportResultFromEnvelope(body);
      setExports((current) => [parsedResult, ...current]);
      if (!response.ok || parsedResult.errorMessage) {
        setExportStatusMessage(parsedResult.errorMessage ?? `${format.toUpperCase()} export failed.`);
        return;
      }
      setExportStatusMessage(`${format.toUpperCase()} export generated locally. No email, upload, submit, or apply action happened.`);
    } catch (error) {
      setExports((current) => [{ externalActionTaken: false, errorCode: "NETWORK_ERROR", errorMessage: error instanceof Error ? error.message : "Unknown network error." }, ...current]);
      setExportStatusMessage(`Network/runtime error while exporting ${format.toUpperCase()}.`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <SafetyWarning />

      <section className="section">
        <h2>Resume Factory</h2>
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
          <label>
            Template
            <select value={fields.templateKey} onChange={(event) => updateField("templateKey", event.target.value)}>
              {(templates.length > 0 ? templates : [{ key: DEFAULT_RESUME_TEMPLATE_KEY, name: "ATS Technical v2", description: "Default local template", defaultSectionOrder: DEFAULT_SECTION_ORDER }]).map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}
            </select>
          </label>
          <label>
            Section order
            <input value={sectionOrderText} onChange={(event) => updateSectionOrder(event.target.value)} />
          </label>
          <button type="button" disabled={isLoading} onClick={() => void generateLocalResume()}>
            {isLoading ? "Generating resume..." : "Generate local review resume"}
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
        <h2>Review Checklist</h2>
        <ReviewChecklist result={result} />
      </section>

      <ExportWorkspace result={result} exports={exports} statusMessage={exportStatusMessage} isExporting={isExporting} onExport={(format) => void exportResume(format)} />

      <section className="section">
        <h2>Resume Preview</h2>
        <ResumePreview result={result} latestPayload={latestPayload} alignment={alignment} />
      </section>
    </>
  );
}

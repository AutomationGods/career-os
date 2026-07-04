"use client";

import { useEffect, useMemo, useState } from "react";
import { getJson } from "./fetch-json";
import { buildUploadedResumeFinalReview } from "./resume-review";
type CommandEnvelope<T = unknown> = { commandId: string; status: string; result: T };
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberText(value: unknown, fallback = "0") {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;
}

const failedUploadStatusMessage = "Upload failed: Internal Server Error.";
const lastResumeFilenameStorageKey = "career-command:last-selected-resume-filename";
const lastStatusMessageStorageKey = "career-command:last-status-message";
const lastUploadConfirmationStorageKey = "career-command:last-upload-confirmation";

const emptyCareerCommandStatus: UnknownRecord = {
  uiSnapshot: {
    resumeFileTitle: "2026 Gregory Baskin Resume Updated",
    selectedUploadFile: "2026 - Gregory Baskin - Resume - Updated.docx",
    uploadConfirmation: "None yet.",
    currentStatusMessage: failedUploadStatusMessage
  },
  sourceDocuments: { documents: [], claims: [] },
  claims: [],
  profileFacts: [],
  careerProfile: null,
  opportunities: { opportunities: [], searchQueriesUsed: [], cleanTargetTitlesUsed: [] },
  packets: [],
  resumes: [],
  mission: null
};

const defaultManualSearchQueries = ["Splunk Architect remote", "Splunk Administrator contract", "Splunk Consultant SIEM", "Splunk Engineer federal", "Splunk Cloud Engineer", "Splunk Enterprise Security Engineer", "Cribl Engineer remote", "Cribl Consultant", "SIEM Engineer Splunk", "Detection Engineer Splunk", "Security Operations Engineer Splunk", "Cybersecurity Engineer Splunk", "ArcSight Engineer", "Cloud Security Splunk", "Log Management Engineer"];
const manualSearchSites = ["LinkedIn", "Dice", "Indeed", "ClearanceJobs only for government/public-trust/clearance-adjacent roles", "ZipRecruiter", "Built In", "company career pages", "recruiter agency sites"];

async function postCommand<T>(url: string, payload: UnknownRecord = {}): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => undefined) as unknown;
  if (!response.ok || !isRecord(body) || body.ok !== true) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    throw new Error(text(error?.message, "Request failed"));
  }
  return (body.data as CommandEnvelope<T>).result;
}

async function postForm<T>(url: string, formData: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: formData });
  } catch (error) {
    throw new Error(error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed before reaching the server.");
  }

  const body = await response.json().catch(() => undefined) as unknown;
  if (!response.ok || !isRecord(body) || body.ok !== true) {
    if (response.status >= 500) throw new Error(failedUploadStatusMessage);
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    const message = text(error?.message, response.statusText || "Upload failed");
    throw new Error(`Upload failed: ${message}`);
  }
  return (body.data as CommandEnvelope<T>).result;
}

async function postAction<T>(url: string, payload: UnknownRecord = {}): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => undefined) as unknown;
  if (!response.ok || !isRecord(body) || body.ok !== true) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    throw new Error(text(error?.message, "Request failed"));
  }
  return body.data as T;
}

function titleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function profileFromStatus(status: UnknownRecord | undefined) {
  return isRecord(status?.careerProfile) ? status.careerProfile : undefined;
}

function opportunitiesFromStatus(status: UnknownRecord | undefined) {
  const pipeline = isRecord(status?.opportunities) ? status.opportunities : undefined;
  return records(pipeline?.opportunities);
}

function packetsFromStatus(status: UnknownRecord | undefined) {
  return records(status?.packets);
}

function missionFromStatus(status: UnknownRecord | undefined) {
  return isRecord(status?.mission) ? status.mission : undefined;
}

function CountCard({ label, value }: { label: string; value: string | number }) {
  return <div className="card"><strong>{value}</strong><p className="muted">{label}</p></div>;
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="muted">None yet.</p>;
  return <ul className="compact-list">{items.slice(0, 12).map((item) => <li key={item}>{item}</li>)}</ul>;
}

function reportList(items: string[], limit = 12) {
  if (items.length === 0) return "- None yet.";
  const shown = items.slice(0, limit).map((item) => `- ${item}`);
  if (items.length > limit) shown.push(`- ... ${items.length - limit} more hidden in GUI report`);
  return shown.join("\n");
}

function reportRecords(items: UnknownRecord[], formatter: (item: UnknownRecord) => string) {
  return items.length > 0 ? items.map((item) => `- ${formatter(item)}`).join("\n") : "- None yet.";
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function CareerCommandPanel() {
  const [title, setTitle] = useState("Pasted resume");
  const [documentType, setDocumentType] = useState("resume");
  const [contentText, setContentText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | undefined>(undefined);
  const [lastSelectedResumeFilename, setLastSelectedResumeFilename] = useState("");
  const [resumeFileTitle, setResumeFileTitle] = useState("");
  const [uploadedResumeConfirmation, setUploadedResumeConfirmation] = useState("");
  const [copyConfirmation, setCopyConfirmation] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [manualJob, setManualJob] = useState({ title: "", company: "", source: "Manual Job Import", applyUrl: "", location: "", remoteStatus: "unknown", employmentType: "", salaryText: "", jobDescription: "" });
  const [bulkText, setBulkText] = useState("");
  const [status, setStatus] = useState<UnknownRecord | undefined>(undefined);
  const [busy, setBusy] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState("Ready.");
  const profile = profileFromStatus(status);
  const opportunities = useMemo(() => opportunitiesFromStatus(status), [status]);
  const packets = useMemo(() => packetsFromStatus(status), [status]);
  const mission = missionFromStatus(status);
  const opportunityPipeline = isRecord(status?.opportunities) ? status.opportunities : undefined;
  const uiSnapshot = isRecord(status?.uiSnapshot) ? status.uiSnapshot : undefined;
  const sourceDiagnostics = isRecord(opportunityPipeline?.sourceDiagnostics) ? opportunityPipeline.sourceDiagnostics : undefined;
  const profileSearchDiagnostics = isRecord(profile?.searchDiagnostics) ? profile.searchDiagnostics : undefined;
  const activeSearchQueries = strings(isRecord(status?.opportunities) ? status.opportunities.searchQueriesUsed : undefined);
  const cleanTargetTitlesUsed = strings(isRecord(status?.opportunities) ? status.opportunities.cleanTargetTitlesUsed : undefined);
  const sourceDocuments = isRecord(status?.sourceDocuments) ? status.sourceDocuments : undefined;
  const importedDocuments = records(sourceDocuments?.documents);
  const documentCount = importedDocuments.length;
  const certificationSearchKeywords = strings(profileSearchDiagnostics?.certificationsUsedAsSearchKeywords).length > 0 ? strings(profileSearchDiagnostics?.certificationsUsedAsSearchKeywords) : strings(profileSearchDiagnostics?.certificationsKeptOutOfTitleSearch);
  const ignoredResumeLinesForSearch = strings(profileSearchDiagnostics?.ignoredResumeLinesForSearch).length > 0 ? strings(profileSearchDiagnostics?.ignoredResumeLinesForSearch) : strings(profileSearchDiagnostics?.excludedKeywords);
  const readyJobSearchSourceTerms = activeSearchQueries.length > 0 ? activeSearchQueries : strings(profile?.suggestedJobSearchKeywords).length > 0 ? strings(profile?.suggestedJobSearchKeywords) : cleanTargetTitlesUsed.length > 0 ? cleanTargetTitlesUsed : strings(profile?.targetTitles);
  const readyJobSearchTerms = [...new Set([...certificationSearchKeywords, ...readyJobSearchSourceTerms])];
  const finalResumeReviewItems = buildUploadedResumeFinalReview({ importedDocumentCount: documentCount, profileBuilt: Boolean(profile), missingEvidence: strings(profile?.missingEvidence), claimsToAvoid: strings(profile?.claimsToAvoid), companiesExcludedFromSearch: strings(profileSearchDiagnostics?.companiesExcludedFromSearch), ignoredResumeLinesForSearch, certificationsUsedAsSearchKeywords: certificationSearchKeywords });
  const searchHelperQueries = useMemo(() => [...new Set([...readyJobSearchTerms.map((item) => `${item} remote`), ...defaultManualSearchQueries])].slice(0, 20), [readyJobSearchTerms]);
  const claimCount = records(sourceDocuments?.claims).length || records(status?.claims).length;
  const factCount = records(status?.profileFacts).length;
  const selectedOpportunity = opportunities.find((job) => job.id === selectedOpportunityId);
  const selectedStatus = text(selectedOpportunity?.status, "");
  const selectedCanCreatePacket = Boolean(selectedOpportunity && !["not_fit", "rejected", "archived", "dismissed"].includes(selectedStatus) && selectedOpportunity.fitGatePassed !== false);

  async function refresh() {
    const nextStatus = await getJson<UnknownRecord>("/api/career-command/status");
    if (!nextStatus) {
      if (message === "Ready.") setMessage("Could not refresh Career Command status. Retry or refresh the page.");
      return;
    }
    setStatus(nextStatus);
    const snapshot = isRecord(nextStatus?.uiSnapshot) ? nextStatus.uiSnapshot : undefined;
    const snapshotFilename = text(snapshot?.selectedUploadFile, "");
    const snapshotTitle = text(snapshot?.resumeFileTitle, "");
    const snapshotMessage = text(snapshot?.currentStatusMessage, "");
    const nextDocuments = records(isRecord(nextStatus?.sourceDocuments) ? nextStatus.sourceDocuments.documents : undefined);
    const latestDocument = nextDocuments[nextDocuments.length - 1];
    const latestFilename = text(latestDocument?.originalFilename, "");
    const latestTitle = text(latestDocument?.title, "");
    if (nextDocuments.length > 0) {
      if (!lastSelectedResumeFilename && latestFilename) setLastSelectedResumeFilename(latestFilename);
      if (!resumeFileTitle && latestTitle) setResumeFileTitle(latestTitle);
    }
    if (nextDocuments.length > 0 && window.localStorage.getItem(lastStatusMessageStorageKey) === failedUploadStatusMessage) {
      const filename = latestFilename || latestTitle || "resume";
      const confirmation = `Confirmed: ${filename} was uploaded, parsed, and saved as your resume.`;
      window.localStorage.removeItem(lastStatusMessageStorageKey);
      window.localStorage.setItem(lastUploadConfirmationStorageKey, confirmation);
      setUploadedResumeConfirmation(confirmation);
      setMessage(`Uploaded and parsed ${filename}.`);
    }
    if (!lastSelectedResumeFilename && snapshotFilename) setLastSelectedResumeFilename(snapshotFilename);
    if (!resumeFileTitle && snapshotTitle) setResumeFileTitle(snapshotTitle);
    if (snapshotMessage && message === "Ready.") setMessage(snapshotMessage);
    const firstOpportunity = opportunitiesFromStatus(nextStatus)[0];
    if (!selectedOpportunityId && typeof firstOpportunity?.id === "string") setSelectedOpportunityId(firstOpportunity.id);
  }

  useEffect(() => {
    const storedFilename = window.localStorage.getItem(lastResumeFilenameStorageKey);
    const storedMessage = window.localStorage.getItem(lastStatusMessageStorageKey);
    const storedConfirmation = window.localStorage.getItem(lastUploadConfirmationStorageKey);
    if (storedFilename) {
      setLastSelectedResumeFilename(storedFilename);
      setResumeFileTitle(titleFromFilename(storedFilename));
    }
    if (storedMessage) setMessage(storedMessage);
    if (storedConfirmation) setUploadedResumeConfirmation(storedConfirmation);
    void refresh();
  }, []);

  async function runStep<T>(label: string, action: () => Promise<T>, success: (result: T) => string) {
    setBusy(label);
    setMessage(`${label}...`);
    try {
      const result = await action();
      if (label === "Uploading resume file") window.localStorage.removeItem(lastStatusMessageStorageKey);
      await refresh();
      const nextMessage = success(result);
      setMessage(nextMessage);
      window.localStorage.setItem(lastStatusMessageStorageKey, nextMessage);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : `${label} failed.`;
      setMessage(nextMessage);
      window.localStorage.setItem(lastStatusMessageStorageKey, nextMessage);
      if (label === "Uploading resume file") window.localStorage.removeItem(lastUploadConfirmationStorageKey);
      if (label === "Uploading resume file" && nextMessage === failedUploadStatusMessage) setStatus(emptyCareerCommandStatus);
    } finally {
      setBusy(undefined);
    }
  }

  async function importDocument() {
    await runStep("Importing document", () => postCommand<{ document?: UnknownRecord }>("/api/source-documents/import", { title, documentType, contentText }), (result) => `Imported ${text(result.document?.title, "document")}.`);
  }

  async function uploadResumeFile() {
    if (!resumeFile) {
      const nextMessage = lastSelectedResumeFilename
        ? `Reselect ${lastSelectedResumeFilename}, then click Upload Resume File. Browsers do not keep the actual file after sign-in or refresh.`
        : "Choose a resume file first, then click Upload Resume File.";
      setMessage(nextMessage);
      window.localStorage.setItem(lastStatusMessageStorageKey, nextMessage);
      return;
    }
    setUploadedResumeConfirmation("");
    const formData = new FormData();
    formData.set("file", resumeFile);
    formData.set("title", resumeFileTitle || titleFromFilename(resumeFile.name));
    formData.set("documentType", "resume");
    await runStep("Uploading resume file", () => postForm<{ document?: UnknownRecord }>("/api/source-documents/upload", formData), (result) => {
      const filename = text(result.document?.originalFilename, resumeFile.name);
      const confirmation = `Confirmed: ${filename} was uploaded, parsed, and saved as your resume.`;
      setUploadedResumeConfirmation(confirmation);
      window.localStorage.setItem(lastUploadConfirmationStorageKey, confirmation);
      return `Uploaded and parsed ${filename}.`;
    });
  }

  async function resetResumeEvidence() {
    const confirmed = window.confirm("Reset Command Center for this user? This clears uploaded resumes, saved resume facts, job-search profile, job matches, application drafts, resume drafts, and today’s plan.");
    if (!confirmed) return;
    await runStep("Resetting Command Center", () => postAction<{ deletedCount?: number }>("/api/career-command/reset-evidence"), (result) => {
      setUploadedResumeConfirmation("");
      window.localStorage.removeItem(lastUploadConfirmationStorageKey);
      setStatus(emptyCareerCommandStatus);
      return `Reset Command Center; cleared ${numberText(result.deletedCount)} saved items.`;
    });
  }

  async function buildCareerProfile() {
    await runStep("Building job-search profile", async () => {
      const extract = await postCommand<{ claims?: unknown[] }>("/api/source-documents/extract-claims", {});
      const facts = await postCommand<{ total?: number }>("/api/profile-facts/create-from-claims", {});
      const generated = await postCommand<UnknownRecord>("/api/career-profile/generate", {});
      return { extract, facts, generated };
    }, (result) => `Built job-search profile from ${records(result.extract.claims).length} facts found and ${numberText(result.facts.total)} saved resume facts.`);
  }

  async function findJobMatches() {
    await runStep("Finding job matches", async () => {
      await postCommand<UnknownRecord>("/api/career-command/find-jobs", { limit: 10, source: "remotive" });
      return postCommand<UnknownRecord>("/api/career-command/rank-jobs", {});
    }, (result) => `Found and ranked ${records(result.opportunities).length} job matches.`);
  }

  async function importManualJob() {
    await runStep("Importing manual job", () => postCommand<UnknownRecord>("/api/career-command/import-job", manualJob), (result) => `Imported and scored ${records(result.opportunities).length} total job matches.`);
  }

  async function importBulkJobs() {
    await runStep("Importing bulk jobs", () => postCommand<UnknownRecord>("/api/career-command/import-job", { source: "Manual Job Import", bulkText }), (result) => `Imported bulk paste; ${records(result.opportunities).length} total job matches are saved.`);
  }

  async function createPacket() {
    await runStep("Creating application draft", () => postCommand<UnknownRecord>("/api/career-command/create-packet", { opportunityId: selectedOpportunityId || undefined }), (result) => `Created application draft ${text(isRecord(result.packet) ? result.packet.id : undefined)} with a grounded resume draft.`);
  }

  async function generateMission() {
    await runStep("Generating today’s plan", () => postCommand<UnknownRecord>("/api/career-command/daily-mission", {}), () => "Generated today’s plan.");
  }

  function buildCareerCommandReport() {
    const enabledSources = strings(sourceDiagnostics?.enabledSources).length > 0 ? strings(sourceDiagnostics?.enabledSources) : ["Remotive public API", "Manual Job Import"];
    const disabledSources = strings(sourceDiagnostics?.disabledSources).length > 0 ? strings(sourceDiagnostics?.disabledSources) : ["LinkedIn scraping", "Indeed scraping", "Dice scraping", "ClearanceJobs scraping", "Gmail", "Google Calendar", "browser automation", "auto-apply", "CAPTCHA bypass"];
    const searchQueriesUsed = activeSearchQueries;
    const readySearchTerms = readyJobSearchTerms;
    const certificationsUsedAsSearchKeywords = certificationSearchKeywords;
    const pastePreview = contentText.trim() ? `${contentText.trim().slice(0, 1200)}${contentText.trim().length > 1200 ? "\n... [truncated in GUI report]" : ""}` : "Empty";
    const statusMessage = message !== "Ready." ? message : text(uiSnapshot?.currentStatusMessage, message);

    return [
      "Command Center Report",
      `Generated: ${new Date().toISOString()}`,
      "",
      "A. Resume Upload",
      `Resume file title: ${resumeFileTitle || text(uiSnapshot?.resumeFileTitle, "Empty")}`,
      `Selected upload file: ${resumeFile?.name || "none selected in this browser session"}`,
      `Last selected upload file: ${(lastSelectedResumeFilename || text(uiSnapshot?.selectedUploadFile, "")) || "none yet"}`,
      `Upload confirmation: ${uploadedResumeConfirmation || text(uiSnapshot?.uploadConfirmation, "None yet.")}`,
      "Uploaded documents:",
      reportRecords(importedDocuments, (document) => `${text(document.title)} · ${text(document.originalFilename, "no original filename")} · ${text(document.documentType)} · imported ${text(document.importedAt, "unknown time")}`),
      `Document title: ${title}`,
      `Document type: ${documentType}`,
      `Paste area content: ${pastePreview}`,
      `Current status message: ${statusMessage}`,
      "",
      "B. Build Job-Search Profile",
      `Documents imported: ${documentCount}`,
      `Facts found: ${claimCount}`,
      `Resume facts created: ${factCount}`,
      "Target titles:",
      reportList(strings(profile?.targetTitles)),
      "Strongest skills:",
      reportList(strings(profile?.strongestSkills)),
      "Strongest tools:",
      reportList(strings(profile?.strongestTools)),
      `Strongest domains: ${strings(profile?.strongestDomains).join(", ") || "None yet."}`,
      "Keywords:",
      reportList(strings(profile?.suggestedJobSearchKeywords)),
      "Needs proof:",
      reportList(strings(profile?.missingEvidence)),
      "Avoid using:",
      reportList(strings(profile?.claimsToAvoid)),
      "",
      "C. Find Job Matches",
      "Enabled job sources:",
      reportList(enabledSources),
      "Disabled / not enabled:",
      reportList(disabledSources),
      "Ready job search terms:",
      reportList(readySearchTerms),
      "Last actual public job query terms used:",
      reportList(searchQueriesUsed),
      "Companies intentionally not used as search terms:",
      reportList(strings(profileSearchDiagnostics?.companiesExcludedFromSearch)),
      "Certifications used as search keywords:",
      reportList(certificationsUsedAsSearchKeywords),
      "Resume lines ignored as search queries:",
      reportList(ignoredResumeLinesForSearch, 8),
      "",
      "Job Matches:",
      reportRecords(opportunities, (job) => `${text(job.title)} · ${text(job.company)} · ${text(job.source)} · Match ${numberText(job.fitScore)} · Result ${job.fitGatePassed === false ? "not a good match" : "review"} · Status ${text(job.status)} · Next ${text(job.nextAction)}`),
      "",
      "D. Application Drafts:",
      reportRecords(packets, (packet) => `${text(isRecord(packet.selectedJob) ? packet.selectedJob.title : undefined)} · Status ${text(packet.status)} · Safety ${isRecord(packet.truthfulnessSummary) ? `${numberText(packet.truthfulnessSummary.usedFactCount)} facts used, ${numberText(packet.truthfulnessSummary.blockedClaimCount)} blocked` : "pending"} · Needs proof ${strings(packet.missingEvidence).join(", ") || "none listed"}`),
      "",
      "E. Today’s Plan",
      `Next best action: ${text(mission?.highestLeverageNextAction, "None yet.")}`,
      "Jobs to apply today:",
      reportRecords(records(mission?.topJobsToApplyToday), (job) => `${text(job.title)} · ${text(job.company)} · Match ${numberText(job.fitScore)}`),
      "Drafts to finish:",
      reportRecords(records(mission?.packetsToFinish), (packet) => `${text(isRecord(packet.selectedJob) ? packet.selectedJob.title : undefined)} · ${text(packet.status)}`),
      "Resume variants:",
      reportList(strings(mission?.resumeVariantsToGenerate)),
      "Proof to gather:",
      reportList(strings(mission?.missingEvidenceToGather)),
      "",
      "F. Final Resume Review",
      reportList(finalResumeReviewItems, 16)
    ].join("\n");
  }

  async function copyCareerCommandReport() {
    setCopyConfirmation("");
    try {
      await copyTextToClipboard(buildCareerCommandReport());
      setCopyConfirmation("Copied Command Center report to clipboard.");
      setMessage("Copied Command Center report. Paste it here so I can inspect the exact state.");
    } catch {
      setCopyConfirmation("Copy failed. Select the page text manually and paste it here.");
      setMessage("Could not copy automatically. Select the page text manually and paste it here.");
    }
  }

  return (
    <>
      <section className="section warning-card">
        <h2>Safety rails</h2>
        <ul className="compact-list">
          <li>Resume text creates user-asserted or needs-evidence facts, not automatically verified facts.</li>
          <li>Public Trust stays Public Trust and is never upgraded into security clearance.</li>
          <li>Packets and resumes stay inside Career OS for manual review and manual application.</li>
        </ul>
      </section>

      <section className="section">
        <div className="card form-card">
          <strong>Need help?</strong>
          <p className="muted">Click this after upload, profile, jobs, or plan actions, then paste the copied report into chat.</p>
          <button type="button" disabled={Boolean(busy)} onClick={() => void copyCareerCommandReport()}>Copy Command Center Report</button>
          {copyConfirmation ? <p className="badge" role="status">{copyConfirmation}</p> : null}
        </div>
      </section>

      <section className="section">
        <h2>A. Upload Resume</h2>
        <div className="card form-card">
          <label>Resume file title<input value={resumeFileTitle} onChange={(event) => setResumeFileTitle(event.target.value)} placeholder="Defaults to the uploaded filename" /></label>
          <label>Upload resume file<input type="file" accept=".pdf,.doc,.docx,.txt,.md,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/rtf" onChange={(event) => {
            const file = event.target.files?.[0];
            setResumeFile(file);
            setLastSelectedResumeFilename(file?.name ?? "");
            if (file?.name) {
              window.localStorage.setItem(lastResumeFilenameStorageKey, file.name);
              window.localStorage.removeItem(lastStatusMessageStorageKey);
              const nextMessage = `Ready to upload ${file.name}. Click Upload Resume File.`;
              setMessage(nextMessage);
            } else {
              window.localStorage.removeItem(lastResumeFilenameStorageKey);
            }
            setResumeFileTitle(file ? titleFromFilename(file.name) : "");
            setUploadedResumeConfirmation("");
            window.localStorage.removeItem(lastUploadConfirmationStorageKey);
          }} /></label>
          <p className="muted">Selected file: {resumeFile?.name || "none selected in this browser session"}</p>
          {!resumeFile && lastSelectedResumeFilename ? <p className="muted">Last selected before refresh/sign-in: {lastSelectedResumeFilename}. Reselect it before uploading.</p> : null}
          {importedDocuments.length > 0 ? <p className="muted">Uploaded document: {text(importedDocuments[importedDocuments.length - 1]?.title)} ({text(importedDocuments[importedDocuments.length - 1]?.originalFilename, "no original filename")})</p> : null}
          <button type="button" disabled={Boolean(busy)} onClick={() => void uploadResumeFile()}>{busy === "Uploading resume file" ? "Uploading..." : "Upload Resume File"}</button>{" "}
          <button type="button" disabled={Boolean(busy) || (documentCount === 0 && claimCount === 0 && factCount === 0 && opportunities.length === 0 && packets.length === 0 && !profile && !mission)} onClick={() => void resetResumeEvidence()}>{busy === "Resetting Command Center" ? "Resetting..." : "Reset Command Center"}</button>
          <p className="muted">Reset clears uploaded resumes, saved resume facts, job-search profile, job matches, application drafts, resume drafts, and today’s plan before re-uploading.</p>
          {uploadedResumeConfirmation ? <p className="badge" role="status">{uploadedResumeConfirmation}</p> : null}
          <p className="muted">Supported: PDF, DOCX, DOC, TXT, MD, and RTF. Scanned image resumes may need manual paste because Career OS does not run OCR.</p>
          <label>Document title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Document type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="resume">Resume</option><option value="cover_letter">Cover letter</option><option value="performance_review">Performance review</option><option value="portfolio">Portfolio</option><option value="job_history">Job history</option><option value="other">Other</option></select></label>
          <label>Paste resume or career document text<textarea rows={12} value={contentText} onChange={(event) => setContentText(event.target.value)} placeholder="Paste your resume, brag doc, portfolio text, or career notes here." /></label>
          <button type="button" disabled={Boolean(busy) || contentText.trim().length < 20} onClick={() => void importDocument()}>{busy === "Importing document" ? "Importing..." : "Import Pasted Text"}</button>
          <p className="muted" aria-live="polite">{message !== "Ready." ? message : text(uiSnapshot?.currentStatusMessage, message)}</p>
        </div>
      </section>

      <section className="section">
        <h2>B. Build Job-Search Profile</h2>
        <div className="grid">
          <CountCard label="uploaded documents" value={documentCount} />
          <CountCard label="facts found" value={claimCount} />
          <CountCard label="resume facts saved" value={factCount} />
        </div>
        <p><button type="button" disabled={Boolean(busy) || documentCount === 0} onClick={() => void buildCareerProfile()}>{busy === "Building job-search profile" ? "Building..." : "Build My Job-Search Profile"}</button></p>
        <div className="grid">
          <div className="card"><strong>Target roles</strong><List items={strings(profile?.targetTitles)} /></div>
          <div className="card"><strong>Strongest skills</strong><List items={strings(profile?.strongestSkills)} /></div>
          <div className="card"><strong>Strongest tools</strong><List items={strings(profile?.strongestTools)} /></div>
          <div className="card"><strong>Strongest domains</strong><p>{strings(profile?.strongestDomains).join(", ") || "None yet."}</p></div>
          <div className="card"><strong>Search keywords</strong><List items={strings(profile?.suggestedJobSearchKeywords)} /></div>
          <div className="card"><strong>Needs proof</strong><List items={strings(profile?.missingEvidence)} /></div>
          <div className="card"><strong>Avoid using</strong><List items={strings(profile?.claimsToAvoid)} /></div>
        </div>
      </section>

      <section className="section">
        <h2>C. Find Job Matches</h2>
        <details className="card">
          <summary>Search details</summary>
          <div className="grid">
            <div className="card"><strong>Active sources</strong><List items={strings(sourceDiagnostics?.enabledSources).length > 0 ? strings(sourceDiagnostics?.enabledSources) : ["Remotive public API", "Manual Job Import"]} /></div>
            <div className="card"><strong>Off-limits sources</strong><List items={strings(sourceDiagnostics?.disabledSources).length > 0 ? strings(sourceDiagnostics?.disabledSources) : ["LinkedIn scraping", "Indeed scraping", "Dice scraping", "ClearanceJobs scraping", "Gmail", "Google Calendar", "browser automation", "auto-apply", "CAPTCHA bypass"]} /></div>
            <div className="card"><strong>Search terms</strong><p>Ready job search terms:</p><List items={readyJobSearchTerms} /><p>Last public job query:</p><List items={activeSearchQueries} /></div>
            <div className="card"><strong>Safety filters</strong><p>Companies not searched:</p><List items={strings(profileSearchDiagnostics?.companiesExcludedFromSearch)} /><p>Certifications used as search keywords:</p><List items={certificationSearchKeywords} /><p>Resume lines ignored as search queries:</p><List items={strings(profileSearchDiagnostics?.ignoredResumeLinesForSearch).length > 0 ? strings(profileSearchDiagnostics?.ignoredResumeLinesForSearch) : strings(profileSearchDiagnostics?.excludedKeywords)} /></div>
          </div>
        </details>
        <p>
          <button type="button" disabled={Boolean(busy) || !profile} onClick={() => void findJobMatches()}>{busy === "Finding job matches" ? "Finding..." : "Find Job Matches"}</button>
        </p>
      </section>

      <section className="section">
        <h2>Add a Job Manually</h2>
        <div className="card form-card">
          <label>Job title<input value={manualJob.title} onChange={(event) => setManualJob({ ...manualJob, title: event.target.value })} placeholder="Splunk Architect" /></label>
          <label>Company<input value={manualJob.company} onChange={(event) => setManualJob({ ...manualJob, company: event.target.value })} placeholder="unknown is OK" /></label>
          <label>Source<input value={manualJob.source} onChange={(event) => setManualJob({ ...manualJob, source: event.target.value })} placeholder="LinkedIn, Dice, company careers, recruiter email" /></label>
          <label>Apply URL<input value={manualJob.applyUrl} onChange={(event) => setManualJob({ ...manualJob, applyUrl: event.target.value })} placeholder="Paste the apply URL; no scraping runs" /></label>
          <label>Location<input value={manualJob.location} onChange={(event) => setManualJob({ ...manualJob, location: event.target.value })} placeholder="Remote, Washington DC, unknown" /></label>
          <label>Remote status<select value={manualJob.remoteStatus} onChange={(event) => setManualJob({ ...manualJob, remoteStatus: event.target.value })}><option value="unknown">unknown</option><option value="remote">remote</option><option value="hybrid">hybrid</option><option value="onsite">onsite</option></select></label>
          <label>Employment type<input value={manualJob.employmentType} onChange={(event) => setManualJob({ ...manualJob, employmentType: event.target.value })} placeholder="full-time, contract, unknown" /></label>
          <label>Salary text<input value={manualJob.salaryText} onChange={(event) => setManualJob({ ...manualJob, salaryText: event.target.value })} placeholder="Leave blank if unknown" /></label>
          <label>Pasted job description<textarea rows={10} value={manualJob.jobDescription} onChange={(event) => setManualJob({ ...manualJob, jobDescription: event.target.value })} placeholder="Paste the real job description here. Career OS will score it, not scrape it." /></label>
          <button type="button" disabled={Boolean(busy) || (!manualJob.title.trim() && !manualJob.jobDescription.trim())} onClick={() => void importManualJob()}>{busy === "Importing manual job" ? "Importing..." : "Import Job"}</button>
          <p className="muted">Unknown salary, clearance, certification requirements, and company facts stay unknown unless present in your pasted job text.</p>
        </div>
      </section>

      <section className="section">
        <h2>Paste Multiple Jobs</h2>
        <div className="card form-card">
          <label>Paste multiple job blurbs<textarea rows={8} value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={"Use clearly separated chunks with Title: and Company: labels. If Career OS is uncertain, it imports one batch for review instead of inventing multiple jobs."} /></label>
          <button type="button" disabled={Boolean(busy) || bulkText.trim().length < 20} onClick={() => void importBulkJobs()}>{busy === "Importing bulk jobs" ? "Importing..." : "Import Bulk Paste"}</button>
        </div>
      </section>

      <section className="section">
        <h2>Search These Sites Manually</h2>
        <div className="grid">
          <div className="card"><strong>Copy/paste search strings</strong><List items={searchHelperQueries} /></div>
          <div className="card"><strong>Suggested sites to search manually</strong><List items={manualSearchSites} /><p className="muted">This helper does not scrape sites. It only gives search strings for you to copy and paste.</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Job Matches</h2>
        <div className="grid">
          {opportunities.length === 0 ? <div className="card"><p className="muted">No job matches yet. Build your job-search profile, then click Find Job Matches.</p></div> : opportunities.map((job) => (
            <div className="card" key={text(job.id)}>
              <strong>{text(job.title)}</strong>
              <p className="muted">{text(job.company)} · {text(job.source)} · {text(job.location)} · {text(job.remoteStatus)}</p>
              <p>Match score: {numberText(job.fitScore)} · Effort: {text(job.applicationDifficulty)} · Result: {job.fitGatePassed === false ? "not a good match" : "good enough to review"}</p>
              <p>Why it matches: {strings(job.matchedStrongKeywords).join(", ") || "none"}</p>
              <p>Weak signals: {strings(job.matchedWeakKeywords).join(", ") || "none"}</p>
              <p>Why it may be weak: {strings(job.missingRequiredContext).join(", ") || "none"}</p>
              <p>Missing skills/evidence: {strings(job.missingSkills).join(", ") || "none"}</p>
              <p>Risks: {strings(job.risks).join(", ") || "none flagged"}</p>
              <p>Rejection reason: {text(job.rejectionReason, "none")}</p>
              <p>Salary: {text(job.salaryText)}</p>
              <p>Next: {text(job.nextAction)}</p>
              <label><input type="radio" checked={selectedOpportunityId === job.id} onChange={() => setSelectedOpportunityId(text(job.id, ""))} /> Select for application draft</label>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>D. Application Draft</h2>
        <div className="card form-card">
          <label>Selected job<select value={selectedOpportunityId} onChange={(event) => setSelectedOpportunityId(event.target.value)}>{opportunities.map((job) => <option key={text(job.id)} value={text(job.id)}>{text(job.title)} · {text(job.company)}</option>)}</select></label>
          <button type="button" disabled={Boolean(busy) || !selectedCanCreatePacket} onClick={() => void createPacket()}>{busy === "Creating application draft" ? "Creating..." : "Create Application Draft"}</button>
          <p className="muted">We’ll draft only from facts found in your resume/profile.</p>
          {!selectedCanCreatePacket && selectedOpportunity ? <p className="muted">Jobs marked not a good match cannot create application drafts or resume drafts.</p> : null}
        </div>
        <div className="grid">
          {packets.slice(0, 4).map((packet) => (
            <div className="card" key={text(packet.id)}>
              <strong>{text(isRecord(packet.selectedJob) ? packet.selectedJob.title : undefined)}</strong>
              <p>Status: {text(packet.status)}</p>
              <p>Resume safety check: {isRecord(packet.truthfulnessSummary) ? `${numberText(packet.truthfulnessSummary.usedFactCount)} facts used, ${numberText(packet.truthfulnessSummary.blockedClaimCount)} blocked` : "pending"}</p>
              <p>Needs proof: {strings(packet.missingEvidence).join(", ") || "none listed"}</p>
              <p>Next: {text(packet.nextAction)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>E. Today’s Plan</h2>
        <p><button type="button" disabled={Boolean(busy)} onClick={() => void generateMission()}>{busy === "Generating today’s plan" ? "Generating..." : "Generate Today’s Plan"}</button></p>
        <div className="grid">
          <div className="card"><strong>Next best action</strong><p>{text(mission?.highestLeverageNextAction, "Generate a plan after finding job matches.")}</p></div>
          <div className="card"><strong>Jobs to apply to today</strong><List items={records(mission?.topJobsToApplyToday).map((job) => `${text(job.title)} · ${text(job.company)} · Match ${numberText(job.fitScore)}`)} /></div>
          <div className="card"><strong>Drafts to finish</strong><List items={records(mission?.packetsToFinish).map((packet) => `${text(isRecord(packet.selectedJob) ? packet.selectedJob.title : undefined)} · ${text(packet.status)}`)} /></div>
          <div className="card"><strong>Resume drafts</strong><List items={strings(mission?.resumeVariantsToGenerate)} /></div>
          <div className="card"><strong>Proof to gather</strong><List items={strings(mission?.missingEvidenceToGather)} /></div>
          <div className="card"><strong>Follow-ups due</strong><List items={records(mission?.followupsDue).map((person) => text(person.name))} /></div>
        </div>
      </section>

      <section className="section warning-card">
        <h2>F. Final Resume Review</h2>
        <p className="muted">Review these resume findings before treating the Command Center as complete.</p>
        <List items={finalResumeReviewItems} />
      </section>
    </>
  );
}

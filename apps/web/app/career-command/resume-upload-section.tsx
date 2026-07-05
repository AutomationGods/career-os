import { CountCard } from "./list-components";
import { lastResumeFilenameStorageKey, lastStatusMessageStorageKey, lastUploadConfirmationStorageKey, text, titleFromFilename, type UnknownRecord } from "./helpers";

type ResumeUploadSectionProps = {
  busy?: string;
  claimCount: number;
  contentText: string;
  documentCount: number;
  documentType: string;
  factCount: number;
  importedDocuments: UnknownRecord[];
  lastSelectedResumeFilename: string;
  message: string;
  mission?: UnknownRecord;
  opportunities: UnknownRecord[];
  packets: UnknownRecord[];
  profile?: UnknownRecord;
  resumeFile?: File;
  resumeFileTitle: string;
  title: string;
  uiSnapshot?: UnknownRecord;
  uploadedResumeConfirmation: string;
  importDocument: () => void;
  resetResumeEvidence: () => void;
  setContentText: (value: string) => void;
  setDocumentType: (value: string) => void;
  setLastSelectedResumeFilename: (value: string) => void;
  setMessage: (value: string) => void;
  setResumeFile: (value: File | undefined) => void;
  setResumeFileTitle: (value: string) => void;
  setTitle: (value: string) => void;
  setUploadedResumeConfirmation: (value: string) => void;
  uploadResumeFile: () => void;
};

export function SafetyRails() {
  return (
    <section className="section warning-card">
      <h2>Safety rails</h2>
      <ul className="compact-list">
        <li>Resume text creates user-asserted or needs-evidence facts, not automatically verified facts.</li>
        <li>Public Trust stays Public Trust and is never upgraded into security clearance.</li>
        <li>Packets and resumes stay inside Career OS for manual review and manual application.</li>
      </ul>
    </section>
  );
}

export function ResumeUploadSection(props: ResumeUploadSectionProps) {
  const {
    busy,
    claimCount,
    contentText,
    documentCount,
    documentType,
    factCount,
    importedDocuments,
    lastSelectedResumeFilename,
    message,
    mission,
    opportunities,
    packets,
    profile,
    resumeFile,
    resumeFileTitle,
    title,
    uiSnapshot,
    uploadedResumeConfirmation,
    importDocument,
    resetResumeEvidence,
    setContentText,
    setDocumentType,
    setLastSelectedResumeFilename,
    setMessage,
    setResumeFile,
    setResumeFileTitle,
    setTitle,
    setUploadedResumeConfirmation,
    uploadResumeFile
  } = props;
  const canReset = documentCount > 0 || claimCount > 0 || factCount > 0 || opportunities.length > 0 || packets.length > 0 || Boolean(profile) || Boolean(mission);

  return (
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
            setMessage(`Ready to upload ${file.name}. Click Upload Resume File.`);
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
        <button type="button" disabled={Boolean(busy)} onClick={() => uploadResumeFile()}>{busy === "Uploading resume file" ? "Uploading..." : "Upload Resume File"}</button>{" "}
        <button type="button" disabled={Boolean(busy) || !canReset} onClick={() => resetResumeEvidence()}>{busy === "Resetting Command Center" ? "Resetting..." : "Reset Command Center"}</button>
        <p className="muted">Reset clears uploaded resumes, saved resume facts, job-search profile, job matches, application drafts, resume drafts, and today’s plan before re-uploading.</p>
        {uploadedResumeConfirmation ? <p className="badge" role="status">{uploadedResumeConfirmation}</p> : null}
        <p className="muted">Supported: PDF, DOCX, DOC, TXT, MD, and RTF. Scanned image resumes may need manual paste because Career OS does not run OCR.</p>
        <label>Document title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Document type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="resume">Resume</option><option value="cover_letter">Cover letter</option><option value="performance_review">Performance review</option><option value="portfolio">Portfolio</option><option value="job_history">Job history</option><option value="other">Other</option></select></label>
        <label>Paste resume or career document text<textarea rows={12} value={contentText} onChange={(event) => setContentText(event.target.value)} placeholder="Paste your resume, brag doc, portfolio text, or career notes here." /></label>
        <button type="button" disabled={Boolean(busy) || contentText.trim().length < 20} onClick={() => importDocument()}>{busy === "Importing document" ? "Importing..." : "Import Pasted Text"}</button>
        <p className="muted" aria-live="polite">{message !== "Ready." ? message : text(uiSnapshot?.currentStatusMessage, message)}</p>
      </div>
    </section>
  );
}

export function ProfileCounts({ claimCount, documentCount, factCount }: { claimCount: number; documentCount: number; factCount: number }) {
  return <div className="grid"><CountCard label="uploaded documents" value={documentCount} /><CountCard label="facts found" value={claimCount} /><CountCard label="resume facts saved" value={factCount} /></div>;
}

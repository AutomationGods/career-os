"use client";

import { useEffect, useMemo, useState } from "react";
import { postAction, postCommand, postForm } from "./api-client";
import { ApplicationDraftSection } from "./application-draft-section";
import { getJson } from "./fetch-json";
import {
  copyTextToClipboard,
  defaultManualSearchQueries,
  emptyCareerCommandStatus,
  failedUploadStatusMessage,
  isRecord,
  lastResumeFilenameStorageKey,
  lastStatusMessageStorageKey,
  lastUploadConfirmationStorageKey,
  missionFromStatus,
  numberText,
  opportunitiesFromStatus,
  packetsFromStatus,
  profileFromStatus,
  records,
  strings,
  text,
  titleFromFilename,
  type UnknownRecord
} from "./helpers";
import { JobImportSection } from "./job-import-section";
import { JobMatchesSection } from "./job-matches-section";
import { MissionSection, ReportHelpSection } from "./mission-report-section";
import { ProfileSummarySection } from "./profile-summary-section";
import { buildCareerCommandReport } from "./report";
import { buildUploadedResumeFinalReview } from "./resume-review";
import { ResumeUploadSection, SafetyRails } from "./resume-upload-section";

const initialManualJob = { title: "", company: "", source: "Manual Job Import", applyUrl: "", location: "", remoteStatus: "unknown", employmentType: "", salaryText: "", jobDescription: "" };

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
  const [manualJob, setManualJob] = useState(initialManualJob);
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

  function currentReport() {
    return buildCareerCommandReport({ activeSearchQueries, certificationSearchKeywords, claimCount, contentText, documentCount, documentType, factCount, finalResumeReviewItems, ignoredResumeLinesForSearch, importedDocuments, lastSelectedResumeFilename, message, mission, opportunities, packets, profile, profileSearchDiagnostics, readyJobSearchTerms, resumeFile, resumeFileTitle, sourceDiagnostics, title, uiSnapshot, uploadedResumeConfirmation });
  }

  async function copyCareerCommandReport() {
    setCopyConfirmation("");
    try {
      await copyTextToClipboard(currentReport());
      setCopyConfirmation("Copied Command Center report to clipboard.");
      setMessage("Copied Command Center report. Paste it here so I can inspect the exact state.");
    } catch {
      setCopyConfirmation("Copy failed. Select the page text manually and paste it here.");
      setMessage("Could not copy automatically. Select the page text manually and paste it here.");
    }
  }

  return (
    <>
      <SafetyRails />
      <ReportHelpSection busy={busy} copyCareerCommandReport={() => void copyCareerCommandReport()} copyConfirmation={copyConfirmation} />
      <ResumeUploadSection busy={busy} claimCount={claimCount} contentText={contentText} documentCount={documentCount} documentType={documentType} factCount={factCount} importedDocuments={importedDocuments} lastSelectedResumeFilename={lastSelectedResumeFilename} message={message} mission={mission} opportunities={opportunities} packets={packets} profile={profile} resumeFile={resumeFile} resumeFileTitle={resumeFileTitle} title={title} uiSnapshot={uiSnapshot} uploadedResumeConfirmation={uploadedResumeConfirmation} importDocument={() => void importDocument()} resetResumeEvidence={() => void resetResumeEvidence()} setContentText={setContentText} setDocumentType={setDocumentType} setLastSelectedResumeFilename={setLastSelectedResumeFilename} setMessage={setMessage} setResumeFile={setResumeFile} setResumeFileTitle={setResumeFileTitle} setTitle={setTitle} setUploadedResumeConfirmation={setUploadedResumeConfirmation} uploadResumeFile={() => void uploadResumeFile()} />
      <ProfileSummarySection busy={busy} claimCount={claimCount} documentCount={documentCount} factCount={factCount} profile={profile} buildCareerProfile={() => void buildCareerProfile()} />
      <JobImportSection activeSearchQueries={activeSearchQueries} bulkText={bulkText} busy={busy} certificationSearchKeywords={certificationSearchKeywords} ignoredResumeLinesForSearch={ignoredResumeLinesForSearch} manualJob={manualJob} profile={profile} profileSearchDiagnostics={profileSearchDiagnostics} readyJobSearchTerms={readyJobSearchTerms} searchHelperQueries={searchHelperQueries} sourceDiagnostics={sourceDiagnostics} findJobMatches={() => void findJobMatches()} importBulkJobs={() => void importBulkJobs()} importManualJob={() => void importManualJob()} setBulkText={setBulkText} setManualJob={setManualJob} />
      <JobMatchesSection opportunities={opportunities} selectedOpportunityId={selectedOpportunityId} setSelectedOpportunityId={setSelectedOpportunityId} />
      <ApplicationDraftSection busy={busy} createPacket={() => void createPacket()} opportunities={opportunities} packets={packets} selectedCanCreatePacket={selectedCanCreatePacket} selectedOpportunity={selectedOpportunity} selectedOpportunityId={selectedOpportunityId} setSelectedOpportunityId={setSelectedOpportunityId} />
      <MissionSection busy={busy} finalResumeReviewItems={finalResumeReviewItems} generateMission={() => void generateMission()} mission={mission} />
    </>
  );
}

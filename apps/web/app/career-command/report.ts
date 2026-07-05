import { isRecord, numberText, records, reportList, reportRecords, strings, text, type UnknownRecord } from "./helpers";

type CareerCommandReportInput = {
  activeSearchQueries: string[];
  certificationSearchKeywords: string[];
  claimCount: number;
  contentText: string;
  documentCount: number;
  documentType: string;
  factCount: number;
  finalResumeReviewItems: string[];
  ignoredResumeLinesForSearch: string[];
  importedDocuments: UnknownRecord[];
  lastSelectedResumeFilename: string;
  message: string;
  mission?: UnknownRecord;
  opportunities: UnknownRecord[];
  packets: UnknownRecord[];
  profile?: UnknownRecord;
  profileSearchDiagnostics?: UnknownRecord;
  readyJobSearchTerms: string[];
  resumeFile?: File;
  resumeFileTitle: string;
  sourceDiagnostics?: UnknownRecord;
  title: string;
  uiSnapshot?: UnknownRecord;
  uploadedResumeConfirmation: string;
};

export function buildCareerCommandReport(input: CareerCommandReportInput) {
  const {
    activeSearchQueries,
    certificationSearchKeywords,
    claimCount,
    contentText,
    documentCount,
    documentType,
    factCount,
    finalResumeReviewItems,
    ignoredResumeLinesForSearch,
    importedDocuments,
    lastSelectedResumeFilename,
    message,
    mission,
    opportunities,
    packets,
    profile,
    profileSearchDiagnostics,
    readyJobSearchTerms,
    resumeFile,
    resumeFileTitle,
    sourceDiagnostics,
    title,
    uiSnapshot,
    uploadedResumeConfirmation
  } = input;
  const enabledSources = strings(sourceDiagnostics?.enabledSources).length > 0 ? strings(sourceDiagnostics?.enabledSources) : ["Remotive public API", "Manual Job Import"];
  const disabledSources = strings(sourceDiagnostics?.disabledSources).length > 0 ? strings(sourceDiagnostics?.disabledSources) : ["LinkedIn scraping", "Indeed scraping", "Dice scraping", "ClearanceJobs scraping", "Gmail", "Google Calendar", "browser automation", "auto-apply", "CAPTCHA bypass"];
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
    reportList(readyJobSearchTerms),
    "Last actual public job query terms used:",
    reportList(activeSearchQueries),
    "Companies intentionally not used as search terms:",
    reportList(strings(profileSearchDiagnostics?.companiesExcludedFromSearch)),
    "Certifications used as search keywords:",
    reportList(certificationSearchKeywords),
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

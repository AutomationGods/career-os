export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function text(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function numberText(value: unknown, fallback = "0") {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;
}

export const failedUploadStatusMessage = "Upload failed: Internal Server Error.";
export const lastResumeFilenameStorageKey = "career-command:last-selected-resume-filename";
export const lastStatusMessageStorageKey = "career-command:last-status-message";
export const lastUploadConfirmationStorageKey = "career-command:last-upload-confirmation";

export const emptyCareerCommandStatus: UnknownRecord = {
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

export const defaultManualSearchQueries = ["Splunk Architect remote", "Splunk Administrator contract", "Splunk Consultant SIEM", "Splunk Engineer federal", "Splunk Cloud Engineer", "Splunk Enterprise Security Engineer", "Cribl Engineer remote", "Cribl Consultant", "SIEM Engineer Splunk", "Detection Engineer Splunk", "Security Operations Engineer Splunk", "Cybersecurity Engineer Splunk", "ArcSight Engineer", "Cloud Security Splunk", "Log Management Engineer"];
export const manualSearchSites = ["LinkedIn", "Dice", "Indeed", "ClearanceJobs only for government/public-trust/clearance-adjacent roles", "ZipRecruiter", "Built In", "company career pages", "recruiter agency sites"];

export function titleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function profileFromStatus(status: UnknownRecord | undefined) {
  return isRecord(status?.careerProfile) ? status.careerProfile : undefined;
}

export function opportunitiesFromStatus(status: UnknownRecord | undefined) {
  const pipeline = isRecord(status?.opportunities) ? status.opportunities : undefined;
  return records(pipeline?.opportunities);
}

export function packetsFromStatus(status: UnknownRecord | undefined) {
  return records(status?.packets);
}

export function missionFromStatus(status: UnknownRecord | undefined) {
  return isRecord(status?.mission) ? status.mission : undefined;
}

export function reportList(items: string[], limit = 12) {
  if (items.length === 0) return "- None yet.";
  const shown = items.slice(0, limit).map((item) => `- ${item}`);
  if (items.length > limit) shown.push(`- ... ${items.length - limit} more hidden in GUI report`);
  return shown.join("\n");
}

export function reportRecords(items: UnknownRecord[], formatter: (item: UnknownRecord) => string) {
  return items.length > 0 ? items.map((item) => `- ${formatter(item)}`).join("\n") : "- None yet.";
}

export async function copyTextToClipboard(value: string) {
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

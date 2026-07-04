export const DEMO_TARGET_ROLE = "Splunk / Cribl Platform Engineer";
export const DEMO_COMPANY_NAME = "Demo Commercial Company";
export const DEMO_JOB_DESCRIPTION =
  "We are looking for a Splunk and Cribl Platform Engineer with experience in SIEM, log onboarding, observability, Linux, Terraform, AWS, Azure, GCP, and security data pipelines. CISSP and Security+ preferred. No clearance required. Remote role.";

export const DEMO_TARGET_KEYWORDS = [
  "Splunk",
  "Cribl",
  "SIEM",
  "log onboarding",
  "observability",
  "Linux",
  "Terraform",
  "AWS",
  "Azure",
  "GCP",
  "security data pipelines",
  "CISSP",
  "Security+",
  "clearance"
];

export const DEMO_VERIFIED_FACTS = [
  "Built Splunk SIEM dashboards and saved searches for security monitoring.",
  "Implemented Cribl pipelines for routing, filtering, and normalizing observability data.",
  "Performed log onboarding for Linux, AWS, Azure, and GCP sources into security data pipelines.",
  "Managed Terraform modules for cloud observability infrastructure."
];

export const SAFETY_WARNINGS = [
  "This resume is a draft for local review only.",
  "Career OS did not email, upload, submit, or apply to anything.",
  "Verify employer history, dates, and metrics before using externally."
];

export const BLOCKED_DEMO_KEYWORDS = ["clearance", "active clearance", "Secret", "Top Secret", "TS/SCI", "Public Trust", "Polygraph", "fake employer history", "fake metrics"];

export interface ResumeDemoFields {
  targetRole: string;
  companyName: string;
  jobDescription: string;
}

export interface ResumeDemoPayload extends ResumeDemoFields {
  userId?: string;
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId: string;
  verifiedFacts: string[];
  targetKeywords: string[];
}

export interface ResumeDraftSectionView {
  title: string;
  bullets: string[];
}

export interface ResumeDraftView {
  id: string;
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  reviewRequired: boolean;
  sections: ResumeDraftSectionView[];
  content: string;
  sourceFacts: string[];
  targetKeywords: string[];
  matchedFactCount: number;
  unmatchedFactCount: number;
  warnings: string[];
}

export interface TruthfulnessGuardView {
  ok: boolean;
  blockedClaims: string[];
  groundedClaims: string[];
  placeholderClaims: string[];
  warnings: string[];
}

export interface TruthfulnessSummaryView {
  generatedFromProfileFacts: boolean;
  profileFactsLoaded: number;
  usedFactCount: number;
  blockedClaimCount: number;
  needsEvidenceExclusionCount: number;
  missingRequiredFacts: string[];
  notes: string[];
}

export interface ResumeResultView {
  commandId?: string;
  commandStatus?: string;
  sourceSnapshotId?: string;
  reviewRequired: boolean;
  draft?: ResumeDraftView;
  guard?: TruthfulnessGuardView;
  truthfulnessSummary?: TruthfulnessSummaryView;
  generatedFromProfileFacts?: boolean;
  usedFactIds: string[];
  blockedFactIds: string[];
  needsEvidenceFactIds: string[];
  warnings: string[];
  errorCode?: string;
  errorMessage?: string;
}

export interface KeywordAlignmentView {
  verifiedMatches: string[];
  partialMatches: string[];
  missingKeywords: string[];
  blockedKeywords: string[];
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokenSet(value: string) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function normalizeKeyword(value: string) {
  return normalizeText(value);
}

function keywordAppearsInFacts(keyword: string, facts: string[]) {
  const normalizedKeyword = normalizeKeyword(keyword);
  return facts.some((fact) => normalizeText(fact).includes(normalizedKeyword));
}

function keywordPartiallyAppearsInFacts(keyword: string, facts: string[]) {
  const keywordTokens = [...tokenSet(keyword)];
  if (keywordTokens.length <= 1) return false;
  const factTokens = tokenSet(facts.join(" "));
  return keywordTokens.some((token) => factTokens.has(token));
}

function normalizeDraftSection(value: unknown): ResumeDraftSectionView | undefined {
  if (!isRecord(value)) return undefined;
  const title = asString(value.title);
  const bullets = asStringArray(value.bullets);
  if (!title) return undefined;
  return { title, bullets };
}

function normalizeDraft(value: unknown): ResumeDraftView | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id);
  if (!id) return undefined;

  return {
    id,
    jobId: asString(value.jobId),
    companyId: asString(value.companyId),
    applicationPacketId: asString(value.applicationPacketId),
    resumeVersionId: asOptionalString(value.resumeVersionId),
    reviewRequired: asBoolean(value.reviewRequired, true),
    sections: Array.isArray(value.sections) ? value.sections.map(normalizeDraftSection).filter((section): section is ResumeDraftSectionView => Boolean(section)) : [],
    content: asString(value.content),
    sourceFacts: asStringArray(value.sourceFacts),
    targetKeywords: asStringArray(value.targetKeywords),
    matchedFactCount: asNumber(value.matchedFactCount),
    unmatchedFactCount: asNumber(value.unmatchedFactCount),
    warnings: asStringArray(value.warnings)
  };
}

function normalizeGuard(value: unknown): TruthfulnessGuardView | undefined {
  if (!isRecord(value)) return undefined;
  return {
    ok: asBoolean(value.ok),
    blockedClaims: asStringArray(value.blockedClaims),
    groundedClaims: asStringArray(value.groundedClaims),
    placeholderClaims: asStringArray(value.placeholderClaims),
    warnings: asStringArray(value.warnings)
  };
}

function normalizeTruthfulnessSummary(value: unknown): TruthfulnessSummaryView | undefined {
  if (!isRecord(value)) return undefined;
  return {
    generatedFromProfileFacts: asBoolean(value.generatedFromProfileFacts),
    profileFactsLoaded: asNumber(value.profileFactsLoaded),
    usedFactCount: asNumber(value.usedFactCount),
    blockedClaimCount: asNumber(value.blockedClaimCount),
    needsEvidenceExclusionCount: asNumber(value.needsEvidenceExclusionCount),
    missingRequiredFacts: asStringArray(value.missingRequiredFacts),
    notes: asStringArray(value.notes)
  };
}

export function buildResumeDemoPayload(fields: Partial<ResumeDemoFields> = {}): ResumeDemoPayload {
  return {
    jobId: "job-demo-splunk-cribl",
    companyId: "company-demo-commercial",
    applicationPacketId: "packet-demo-splunk-cribl",
    resumeVersionId: "resume-version-demo-splunk-cribl",
    targetRole: fields.targetRole?.trim() || DEMO_TARGET_ROLE,
    companyName: fields.companyName?.trim() || DEMO_COMPANY_NAME,
    jobDescription: fields.jobDescription?.trim() || DEMO_JOB_DESCRIPTION,
    verifiedFacts: DEMO_VERIFIED_FACTS,
    targetKeywords: DEMO_TARGET_KEYWORDS
  };
}

export function resumeResultFromEnvelope(envelope: unknown): ResumeResultView {
  if (!isRecord(envelope)) return { reviewRequired: true, usedFactIds: [], blockedFactIds: [], needsEvidenceFactIds: [], warnings: [], errorCode: "INVALID_RESPONSE", errorMessage: "Resume API returned an unexpected response." };

  if (envelope.ok === false) {
    const error = isRecord(envelope.error) ? envelope.error : undefined;
    const details = isRecord(error?.details) ? error.details : undefined;
    const blockedClaims = asStringArray(details?.blockedClaims);
    const command = isRecord(envelope.command) ? envelope.command : undefined;
    return {
      commandId: asOptionalString(command?.id),
      commandStatus: asOptionalString(command?.status),
      reviewRequired: true,
      guard: blockedClaims.length > 0 ? { ok: false, blockedClaims, groundedClaims: [], placeholderClaims: [], warnings: ["Truthfulness guard blocked unsupported resume claims."] } : undefined,
      usedFactIds: [],
      blockedFactIds: [],
      needsEvidenceFactIds: [],
      warnings: [],
      errorCode: asOptionalString(error?.code) ?? "REQUEST_FAILED",
      errorMessage: asOptionalString(error?.message) ?? "Resume generation failed."
    };
  }

  if (envelope.ok === true && isRecord(envelope.data)) {
    const result = isRecord(envelope.data.result) ? envelope.data.result : undefined;
    return {
      commandId: asOptionalString(envelope.data.commandId),
      commandStatus: asOptionalString(envelope.data.status),
      sourceSnapshotId: asOptionalString(result?.sourceSnapshotId),
      reviewRequired: asBoolean(result?.reviewRequired, true),
      draft: normalizeDraft(result?.draft),
      guard: normalizeGuard(result?.guard),
      truthfulnessSummary: normalizeTruthfulnessSummary(result?.truthfulnessSummary),
      generatedFromProfileFacts: asBoolean(result?.generatedFromProfileFacts),
      usedFactIds: asStringArray(result?.usedFactIds),
      blockedFactIds: asStringArray(result?.blockedFactIds),
      needsEvidenceFactIds: asStringArray(result?.needsEvidenceFactIds),
      warnings: asStringArray(result?.warnings)
    };
  }

  return { reviewRequired: true, usedFactIds: [], blockedFactIds: [], needsEvidenceFactIds: [], warnings: [], errorCode: "INVALID_RESPONSE", errorMessage: "Resume API returned an unexpected response." };
}

export function buildKeywordAlignment(payload: Pick<ResumeDemoPayload, "targetKeywords" | "verifiedFacts">, result?: ResumeResultView): KeywordAlignmentView {
  const facts = result?.draft?.sourceFacts.length ? result.draft.sourceFacts : payload.verifiedFacts;
  const blockedClaims = result?.guard?.blockedClaims ?? [];
  const blockedClaimKeywords = blockedClaims.map((claim) => `Blocked claim: ${claim}`);
  const blockedKeywords = uniqueStrings([...BLOCKED_DEMO_KEYWORDS, ...blockedClaimKeywords]);
  const blockedKeywordSet = new Set(blockedKeywords.map(normalizeKeyword));
  const verifiedMatches: string[] = [];
  const partialMatches: string[] = [];
  const missingKeywords: string[] = [];

  for (const keyword of payload.targetKeywords) {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (blockedKeywordSet.has(normalizedKeyword) || normalizedKeyword === "clearance") continue;
    if (keywordAppearsInFacts(keyword, facts)) verifiedMatches.push(keyword);
    else if (keywordPartiallyAppearsInFacts(keyword, facts)) partialMatches.push(keyword);
    else missingKeywords.push(keyword);
  }

  return { verifiedMatches, partialMatches, missingKeywords, blockedKeywords };
}

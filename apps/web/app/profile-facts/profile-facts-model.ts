export const PROFILE_FACTS_DEMO_USER_ID = "demo-user";

export type ProfileFactFilter = "all" | "verified" | "needs_review" | "blocked" | "resume_allowed";

export interface ProfileFactView {
  id: string;
  userId: string;
  factType: string;
  category?: string;
  label: string;
  value?: string;
  description?: string;
  source?: string;
  sourceType: string;
  confidence: number;
  verificationStatus: string;
  allowedInResume: boolean;
  allowedInCoverLetter: boolean;
  allowedInRecruiterMessage: boolean;
  requiresReview: boolean;
  isBlocked: boolean;
  blockedReason?: string;
}

export interface ProfileFactsSummary {
  verifiedFacts: number;
  blockedClaims: number;
  needsReview: number;
  resumeAllowedFacts: number;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFrom(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberFrom(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function booleanFrom(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeProfileFact(value: unknown): ProfileFactView | undefined {
  if (!isRecord(value)) return undefined;
  const id = stringFrom(value.id);
  const userId = stringFrom(value.userId);
  const factType = stringFrom(value.factType);
  const label = stringFrom(value.label);
  if (!id || !userId || !factType || !label) return undefined;
  return {
    id,
    userId,
    factType,
    category: stringFrom(value.category) || undefined,
    label,
    value: stringFrom(value.value) || undefined,
    description: stringFrom(value.description) || undefined,
    source: stringFrom(value.source) || undefined,
    sourceType: stringFrom(value.sourceType, "unknown"),
    confidence: numberFrom(value.confidence, 0),
    verificationStatus: stringFrom(value.verificationStatus, "needs_review"),
    allowedInResume: booleanFrom(value.allowedInResume),
    allowedInCoverLetter: booleanFrom(value.allowedInCoverLetter),
    allowedInRecruiterMessage: booleanFrom(value.allowedInRecruiterMessage),
    requiresReview: booleanFrom(value.requiresReview),
    isBlocked: booleanFrom(value.isBlocked),
    blockedReason: stringFrom(value.blockedReason) || undefined
  };
}

export function profileFactsFromEnvelope(envelope: unknown): ProfileFactView[] {
  if (!isRecord(envelope) || envelope.ok !== true || !isRecord(envelope.data)) return [];
  const result = isRecord(envelope.data.result) ? envelope.data.result : envelope.data;
  const facts = Array.isArray(result.facts) ? result.facts : [];
  return facts.map(normalizeProfileFact).filter((fact): fact is ProfileFactView => Boolean(fact));
}

export function profileFactFromEnvelope(envelope: unknown): ProfileFactView | undefined {
  if (!isRecord(envelope) || envelope.ok !== true || !isRecord(envelope.data)) return undefined;
  const result = isRecord(envelope.data.result) ? envelope.data.result : envelope.data;
  return normalizeProfileFact(result.fact);
}

function normalizedClaimText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ").replace(/\s+/g, " ").trim();
}

function blockedClaimSet(facts: ProfileFactView[]) {
  return new Set(facts.filter((fact) => fact.isBlocked || fact.verificationStatus === "blocked").map((fact) => normalizedClaimText(fact.label)));
}

export function isShadowedProfileFact(fact: ProfileFactView, blockedClaims: Set<string>) {
  return !(fact.isBlocked || fact.verificationStatus === "blocked") && blockedClaims.has(normalizedClaimText(fact.label));
}

function isResumeAllowedFact(fact: ProfileFactView, blockedClaims: Set<string>) {
  return fact.verificationStatus === "verified" && fact.allowedInResume && !fact.isBlocked && !fact.requiresReview && !isShadowedProfileFact(fact, blockedClaims);
}

export function countProfileFacts(facts: ProfileFactView[]): ProfileFactsSummary {
  const blockedClaims = blockedClaimSet(facts);
  return facts.reduce<ProfileFactsSummary>(
    (summary, fact) => {
      const isShadowed = isShadowedProfileFact(fact, blockedClaims);
      if (fact.verificationStatus === "verified" && !isShadowed) summary.verifiedFacts += 1;
      if (fact.isBlocked || fact.verificationStatus === "blocked") summary.blockedClaims += 1;
      if ((fact.requiresReview || fact.verificationStatus === "needs_review") && !isShadowed) summary.needsReview += 1;
      if (isResumeAllowedFact(fact, blockedClaims)) summary.resumeAllowedFacts += 1;
      return summary;
    },
    { verifiedFacts: 0, blockedClaims: 0, needsReview: 0, resumeAllowedFacts: 0 }
  );
}

export function filterProfileFacts(facts: ProfileFactView[], filter: ProfileFactFilter) {
  const blockedClaims = blockedClaimSet(facts);
  const effectiveFacts = facts.filter((fact) => !isShadowedProfileFact(fact, blockedClaims));
  if (filter === "verified") return effectiveFacts.filter((fact) => fact.verificationStatus === "verified");
  if (filter === "needs_review") return effectiveFacts.filter((fact) => fact.requiresReview || fact.verificationStatus === "needs_review");
  if (filter === "blocked") return effectiveFacts.filter((fact) => fact.isBlocked || fact.verificationStatus === "blocked");
  if (filter === "resume_allowed") return effectiveFacts.filter((fact) => isResumeAllowedFact(fact, blockedClaims));
  return effectiveFacts;
}

export function blockedReasonText(fact: ProfileFactView) {
  return fact.blockedReason || (fact.isBlocked ? "Blocked from resume use." : "");
}

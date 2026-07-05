type UnknownRecord = Record<string, unknown>;

export interface EvidenceDocumentView {
  id: string;
  title: string;
  filename: string;
  kind: string;
  importedAt: string;
  preview: string;
}

export interface EvidenceClaimView {
  id: string;
  claim: string;
  kind: string;
  evidence: string;
  confidence: string;
}

export interface EvidenceFactView {
  id: string;
  claim: string;
  kind: string;
  status: string;
  evidence: string;
  reason: string;
}

export interface MissingEvidenceView {
  id: string;
  item: string;
  reason: string;
}

export interface EvidenceReviewView {
  documents: EvidenceDocumentView[];
  extractedClaims: EvidenceClaimView[];
  profileFacts: EvidenceFactView[];
  resumeAllowedFacts: EvidenceFactView[];
  blockedPrivateFacts: EvidenceFactView[];
  missingEvidence: MissingEvidenceView[];
  counts: {
    documents: number;
    extractedClaims: number;
    profileFacts: number;
    resumeAllowedFacts: number;
    blockedPrivateFacts: number;
    missingEvidence: number;
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function text(value: unknown, fallback = "Not provided") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function sentenceCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function categoryLabel(value: unknown) {
  const raw = text(value, "General");
  const labels: Record<string, string> = {
    public_trust: "Public Trust",
    industry_domain: "Industry experience",
    domain_experience: "Industry experience",
    work_history: "Work history",
    job_title: "Job title",
    work_preference: "Work preference"
  };
  return labels[raw] ?? sentenceCase(raw);
}

function statusLabel(value: unknown) {
  const raw = text(value, "user_asserted");
  const labels: Record<string, string> = {
    verified: "Verified",
    user_asserted: "From your resume",
    inferred: "Needs confirmation",
    needs_evidence: "Needs proof",
    rejected: "Rejected",
    blocked: "Blocked"
  };
  return labels[raw] ?? sentenceCase(raw);
}

function confidenceLabel(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Confidence not available";
  return `${Math.round(value * 100)}% confidence`;
}

function preview(value: unknown) {
  const clean = text(value, "No preview available").replace(/\s+/g, " ");
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function documentViews(sourceDocuments: UnknownRecord | undefined): EvidenceDocumentView[] {
  return records(sourceDocuments?.documents).map((document, index) => ({
    id: text(document.id, `document-${index}`),
    title: text(document.title, "Untitled document"),
    filename: text(document.originalFilename, "No filename saved"),
    kind: categoryLabel(document.documentType),
    importedAt: text(document.importedAt, "Import time not saved"),
    preview: preview(document.contentText)
  }));
}

function claimViews(status: UnknownRecord, sourceDocuments: UnknownRecord | undefined): EvidenceClaimView[] {
  const sourceClaims = records(sourceDocuments?.claims);
  const topLevelClaims = records(status.claims);
  return uniqueById([...sourceClaims, ...topLevelClaims].map((claim, index) => ({
    id: text(claim.id, `claim-${index}`),
    claim: text(claim.claim, "Unnamed claim"),
    kind: categoryLabel(claim.category),
    evidence: preview(claim.evidenceText),
    confidence: confidenceLabel(claim.confidence)
  })));
}

function isResumeAllowed(fact: UnknownRecord) {
  const allowedUses = strings(fact.allowedUses);
  const blockedUses = strings(fact.blockedUses);
  const status = text(fact.truthStatus, "");
  return allowedUses.includes("resume") && !blockedUses.includes("resume") && !["blocked", "rejected", "inferred", "needs_evidence"].includes(status);
}

function isBlockedOrPrivate(fact: UnknownRecord) {
  const blockedUses = strings(fact.blockedUses);
  const status = text(fact.truthStatus, "");
  return blockedUses.includes("resume") || blockedUses.includes("application_packet") || ["blocked", "rejected", "inferred", "needs_evidence"].includes(status);
}

function blockedReason(fact: UnknownRecord) {
  const status = text(fact.truthStatus, "");
  if (status === "needs_evidence") return "Needs proof before resume use.";
  if (status === "inferred") return "Needs confirmation before resume use.";
  if (status === "rejected") return "Marked as not usable.";
  if (status === "blocked") return "Kept private and blocked from use.";
  if (strings(fact.blockedUses).includes("resume")) return "Kept out of resumes.";
  return "Review before using.";
}

function factView(fact: UnknownRecord, index: number): EvidenceFactView {
  return {
    id: text(fact.id, `fact-${index}`),
    claim: text(fact.claim, "Unnamed fact"),
    kind: categoryLabel(fact.category),
    status: statusLabel(fact.truthStatus),
    evidence: preview(fact.evidenceSummary),
    reason: blockedReason(fact)
  };
}

function missingEvidenceViews(status: UnknownRecord, facts: UnknownRecord[]): MissingEvidenceView[] {
  const profile = isRecord(status.careerProfile) ? status.careerProfile : undefined;
  const profileItems = strings(profile?.missingEvidence).map((item, index) => ({
    id: `profile-missing-${index}-${item}`,
    item,
    reason: "The job-search profile flagged this as useful proof to gather."
  }));
  const draftItems = records(status.packets).flatMap((packet, packetIndex) => strings(packet.missingEvidence).map((item, itemIndex) => ({
    id: `draft-missing-${packetIndex}-${itemIndex}-${item}`,
    item,
    reason: "An application draft needs this proof before it can be stronger."
  })));
  const factItems = facts
    .filter((fact) => text(fact.truthStatus, "") === "needs_evidence")
    .map((fact, index) => ({
      id: text(fact.id, `missing-fact-${index}`),
      item: text(fact.claim, "Unnamed fact"),
      reason: "This can be used more strongly after you add proof."
    }));
  return uniqueById([...factItems, ...profileItems, ...draftItems]);
}

export function buildEvidenceReview(status: unknown): EvidenceReviewView {
  const data = isRecord(status) ? status : {};
  const sourceDocuments = isRecord(data.sourceDocuments) ? data.sourceDocuments : undefined;
  const facts = records(data.profileFacts);
  const profileFacts = facts.map(factView);
  const resumeAllowedFacts = facts.filter(isResumeAllowed).map(factView);
  const blockedPrivateFacts = facts.filter(isBlockedOrPrivate).map(factView);
  const missingEvidence = missingEvidenceViews(data, facts);
  const documents = documentViews(sourceDocuments);
  const extractedClaims = claimViews(data, sourceDocuments);

  return {
    documents,
    extractedClaims,
    profileFacts,
    resumeAllowedFacts,
    blockedPrivateFacts,
    missingEvidence,
    counts: {
      documents: documents.length,
      extractedClaims: extractedClaims.length,
      profileFacts: profileFacts.length,
      resumeAllowedFacts: resumeAllowedFacts.length,
      blockedPrivateFacts: blockedPrivateFacts.length,
      missingEvidence: missingEvidence.length
    }
  };
}

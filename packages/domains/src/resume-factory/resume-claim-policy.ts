import type { ProfileFact } from "../profile-facts/manager";

export type ResumeClaimBlockReason =
  | "resume_use_not_allowed"
  | "resume_use_blocked"
  | "truth_status_not_resume_allowed"
  | "needs_evidence"
  | "rejected"
  | "blocked"
  | "inferred_requires_confirmation"
  | "unsupported_formal_claim"
  | "public_trust_not_security_clearance";

export interface ResumeClaimDecision {
  fact: ProfileFact;
  allowed: boolean;
  resumeClaim?: string;
  reasons: ResumeClaimBlockReason[];
  requiresEvidence: boolean;
  evidencePresent: boolean;
  carefulPhrasingRequired: boolean;
}

export interface ResumeClaimPolicyResult {
  decisions: ResumeClaimDecision[];
  allowedDecisions: ResumeClaimDecision[];
  blockedDecisions: ResumeClaimDecision[];
  needsEvidenceDecisions: ResumeClaimDecision[];
}

const strictEvidenceCategories = new Set<ProfileFact["category"]>(["certification", "clearance", "education"]);
const evidenceSourceTypes = new Set<ProfileFact["sourceType"]>(["manual_review", "document_upload", "resume_upload"]);
const securityClearanceTerms = /\b(secret|top secret|ts\/sci|sci|polygraph|security clearance|clearance active|active clearance)\b/i;
const publicTrustTerm = /\bpublic trust\b/i;
const employmentDateOrTitleTerms = /\b(19\d{2}|20\d{2}|present|current|currently|since|from|through|until|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|engineer|administrator|analyst|architect|consultant|developer|director|lead|manager|principal|specialist|title|served as|worked as)\b/i;

function hasEvidence(fact: ProfileFact) {
  return Boolean(fact.sourceRef || fact.evidenceSummary || evidenceSourceTypes.has(fact.sourceType));
}

function requiresStrictEvidence(fact: ProfileFact) {
  if (strictEvidenceCategories.has(fact.category)) return true;
  if (fact.category === "work_history" && employmentDateOrTitleTerms.test(fact.claim)) return true;
  return false;
}

function publicTrustResumeClaim(fact: ProfileFact) {
  if (fact.category !== "clearance" || !publicTrustTerm.test(fact.claim)) return fact.claim;
  return "Public Trust suitability (not a security clearance).";
}

export class ResumeClaimPolicy {
  evaluate(fact: ProfileFact): ResumeClaimDecision {
    const reasons: ResumeClaimBlockReason[] = [];
    const evidencePresent = hasEvidence(fact);
    const requiresEvidence = requiresStrictEvidence(fact);
    const carefulPhrasingRequired = fact.truthStatus === "user_asserted";

    if (!fact.allowedUses.includes("resume")) reasons.push("resume_use_not_allowed");
    if (fact.blockedUses.includes("resume")) reasons.push("resume_use_blocked");

    if (fact.truthStatus === "inferred") reasons.push("inferred_requires_confirmation");
    if (fact.truthStatus === "needs_evidence") reasons.push("needs_evidence");
    if (fact.truthStatus === "rejected") reasons.push("rejected");
    if (fact.truthStatus === "blocked") reasons.push("blocked");
    if (fact.truthStatus !== "verified" && fact.truthStatus !== "user_asserted") reasons.push("truth_status_not_resume_allowed");

    if (requiresEvidence && !evidencePresent) reasons.push("needs_evidence", "unsupported_formal_claim");
    if ((fact.category === "certification" || fact.category === "clearance" || fact.category === "education") && fact.sourceType === "system_inference") reasons.push("unsupported_formal_claim");

    if (fact.category === "clearance" && publicTrustTerm.test(fact.claim) && securityClearanceTerms.test(fact.claim.replace(publicTrustTerm, ""))) {
      reasons.push("public_trust_not_security_clearance");
    }

    const uniqueReasons = [...new Set(reasons)];
    const allowed = uniqueReasons.length === 0;
    return {
      fact,
      allowed,
      resumeClaim: allowed ? publicTrustResumeClaim(fact) : undefined,
      reasons: uniqueReasons,
      requiresEvidence,
      evidencePresent,
      carefulPhrasingRequired
    };
  }

  filter(facts: ProfileFact[]): ResumeClaimPolicyResult {
    const decisions = facts.map((fact) => this.evaluate(fact));
    return {
      decisions,
      allowedDecisions: decisions.filter((decision) => decision.allowed),
      blockedDecisions: decisions.filter((decision) => !decision.allowed),
      needsEvidenceDecisions: decisions.filter((decision) => decision.reasons.includes("needs_evidence") || decision.reasons.includes("unsupported_formal_claim"))
    };
  }
}

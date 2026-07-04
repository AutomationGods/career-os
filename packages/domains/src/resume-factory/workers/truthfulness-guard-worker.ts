import type { TechnicalResumeDraft } from "./technical-resume-worker";

type ResumeDraftLike = Pick<TechnicalResumeDraft, "sections" | "content"> | string;

export interface TruthfulnessGuardInput {
  draft: ResumeDraftLike;
  verifiedFacts: string[];
}

export interface TruthfulnessGuardResult {
  ok: boolean;
  blockedClaims: string[];
  groundedClaims: string[];
  placeholderClaims: string[];
  warnings: string[];
}

function normalizeClaim(value: string) {
  return value
    .trim()
    .replace(/^[-*•]\s*/, "")
    .replace(/[.。]+$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function extractDraftClaims(draft: ResumeDraftLike) {
  if (typeof draft === "string") {
    return draft
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[-*•]\s+/.test(line))
      .map((line) => line.replace(/^[-*•]\s+/, ""));
  }

  return draft.sections.flatMap((section) => section.bullets);
}

function isPlaceholderClaim(claim: string) {
  return /^\[Add [^\]]+\]$/.test(claim.trim());
}

export function assessResumeTruthfulness(input: TruthfulnessGuardInput): TruthfulnessGuardResult {
  const factSet = new Set(input.verifiedFacts.map(normalizeClaim).filter(Boolean));
  const claims = extractDraftClaims(input.draft);
  const placeholderClaims = claims.filter(isPlaceholderClaim);
  const resumeClaims = claims.filter((claim) => !isPlaceholderClaim(claim));
  const blockedClaims = resumeClaims.filter((claim) => !factSet.has(normalizeClaim(claim)));
  const groundedClaims = resumeClaims.filter((claim) => factSet.has(normalizeClaim(claim)));
  const warnings = [
    "This guard only accepts draft bullets that exactly match a resume-allowed profile fact; bracketed scaffold placeholders are not claims.",
    "Human review is required before using the draft externally."
  ];

  if (factSet.size === 0 && resumeClaims.length === 0) {
    return {
      ok: true,
      blockedClaims: [],
      groundedClaims: [],
      placeholderClaims,
      warnings: ["No resume-allowed profile facts were supplied; only a truthful placeholder scaffold was generated.", ...warnings]
    };
  }

  if (factSet.size === 0) {
    return {
      ok: false,
      blockedClaims: resumeClaims,
      groundedClaims: [],
      placeholderClaims,
      warnings: ["No resume-allowed profile facts were supplied; resume claims are blocked.", ...warnings]
    };
  }

  return {
    ok: blockedClaims.length === 0,
    blockedClaims,
    groundedClaims,
    placeholderClaims,
    warnings
  };
}

export class TruthfulnessGuardWorker {
  assess(input: TruthfulnessGuardInput) {
    return assessResumeTruthfulness(input);
  }
}

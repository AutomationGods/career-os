import { evaluateJobFit } from "../../career-profile/role-taxonomy";
import { classifyRemote, segmentClearance, summarizeFitScore, type FitScoreProfile } from "../../job-intelligence";

export interface FitScoreResult {
  score: number;
  passed: boolean;
  status: "ranked" | "not_fit";
  dimensionScores: {
    keywordMatch: number;
    clearanceMatch: number;
    locationFit: number;
  };
  matchedStrongKeywords: string[];
  matchedWeakKeywords: string[];
  missingRequiredContext: string[];
  risks: string[];
  rejectionReason?: string;
  clearanceSegment: string | null;
  remoteStatus: "remote" | "hybrid" | "onsite" | "unknown";
  scoringReason: string;
}

/**
 * Calculates a multi-dimension fit score for a job against the profile.
 * Combines keyword matching, clearance detection, and location classification.
 */
export function calculateFitScore(
  input: { title: string; description?: string; profile?: FitScoreProfile },
): FitScoreResult {
  const { title, description, profile } = input;
  const job = { title, company: "", description, source: "scoring", raw: {} };

  // Dimension 1: Keyword match (from summarizeFitScore)
  const keywordSummary = summarizeFitScore(job, profile);

  // Dimension 2: Role fit evaluation (from evaluateJobFit)
  const roleFit = evaluateJobFit({ title, description });

  // Dimension 3: Clearance detection
  const clearanceSegment = segmentClearance(job);

  // Dimension 4: Location classification
  const remoteStatus = classifyRemote(job);

  // Composite score: keyword match (60%) + role fit bonus (40%)
  const keywordScore = keywordSummary.score;
  const roleFitBonus = roleFit.passed ? Math.min(40, roleFit.score * 0.4) : 0;
  const score = Math.min(100, Math.round(keywordScore * 0.6 + roleFitBonus));

  // Clearance and location affect risks, not the base score
  const risks = [
    ...roleFit.risks,
    ...(clearanceSegment ? ["clearance_or_public_trust_requirement_found"] : []),
  ];

  return {
    score,
    passed: roleFit.passed,
    status: roleFit.status,
    dimensionScores: {
      keywordMatch: keywordScore,
      clearanceMatch: clearanceSegment ? 100 : 0,
      locationFit: remoteStatus === "remote" ? 100 : remoteStatus === "hybrid" ? 70 : remoteStatus === "onsite" ? 40 : 50,
    },
    matchedStrongKeywords: roleFit.matchedStrongKeywords,
    matchedWeakKeywords: roleFit.matchedWeakKeywords,
    missingRequiredContext: roleFit.missingRequiredContext,
    risks,
    rejectionReason: roleFit.rejectionReason,
    clearanceSegment,
    remoteStatus,
    scoringReason: keywordSummary.scoringReason,
  };
}

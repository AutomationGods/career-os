import type { JobSegment, NormalizedJob } from "@career-os/shared";

const remoteTerms = ["remote", "work from home", "anywhere"];
const hybridTerms = ["hybrid"];
const clearanceTerms = ["clearance", "public trust", "secret", "top secret", "ts/sci", "polygraph"];
export const preferredSkills = ["splunk", "cribl", "devops", "siem", "linux", "terraform", "aws", "azure", "gcp", "observability", "sre", "detection engineering"];

export interface FitScoreProfile {
  profileSkills?: string[];
  targetKeywords?: string[];
}

export interface FitScoreSummary {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  scoringReason: string;
  consideredKeywords: string[];
}

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

function uniqueKeywords(keywords: string[]) {
  return [...new Set(keywords.map(normalizeKeyword).filter(Boolean))];
}

export function normalizeJob(raw: Partial<NormalizedJob> & Record<string, unknown>): NormalizedJob {
  return {
    title: String(raw.title ?? raw["text"] ?? "Untitled role"),
    company: String(raw.company ?? "Unknown company"),
    location: raw.location ? String(raw.location) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    url: raw.url ? String(raw.url) : undefined,
    employmentType: raw.employmentType ? String(raw.employmentType) : undefined,
    source: String(raw.source ?? "manual"),
    raw,
  };
}
export function classifyRemote(job: NormalizedJob): "remote" | "hybrid" | "onsite" | "unknown" {
  const text = `${job.title} ${job.location ?? ""} ${job.description ?? ""}`.toLowerCase();
  if (remoteTerms.some((term) => text.includes(term))) return "remote";
  if (hybridTerms.some((term) => text.includes(term))) return "hybrid";
  return job.location ? "onsite" : "unknown";
}
export function segmentClearance(job: NormalizedJob): JobSegment | null {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  if (text.includes("public trust")) return "Public Trust";
  if (text.includes("ts/sci")) return "TS/SCI";
  if (text.includes("top secret")) return "Top Secret";
  if (text.includes("secret")) return "Secret";
  if (text.includes("polygraph")) return "Polygraph";
  if (clearanceTerms.some((term) => text.includes(term))) return "Clearance / Government";
  return null;
}
export function summarizeFitScore(job: NormalizedJob, profile: FitScoreProfile = {}): FitScoreSummary {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const consideredKeywords = uniqueKeywords([...(profile.targetKeywords ?? []), ...(profile.profileSkills ?? []), ...preferredSkills]);
  const matchedKeywords = consideredKeywords.filter((skill) => text.includes(skill));
  const missingKeywords = consideredKeywords.filter((skill) => !matchedKeywords.includes(skill));
  const score = consideredKeywords.length === 0 ? 0 : Math.min(100, Math.round((matchedKeywords.length / consideredKeywords.length) * 100));
  const scoringReason = matchedKeywords.length > 0
    ? `Matched ${matchedKeywords.length} of ${consideredKeywords.length} target/profile keywords: ${matchedKeywords.slice(0, 8).join(", ")}.`
    : `No target/profile keyword matches found across ${consideredKeywords.length} considered keywords.`;
  return { score, matchedKeywords, missingKeywords, scoringReason, consideredKeywords };
}

export function scoreFit(job: NormalizedJob, profile: FitScoreProfile = {}): number {
  return summarizeFitScore(job, profile).score;
}
export function segmentJob(job: NormalizedJob): JobSegment {
  const clearance = segmentClearance(job);
  if (clearance) return clearance;
  if ((job.employmentType ?? "").toLowerCase().includes("contract")) return "Contract";
  if (scoreFit(job) < 15) return "Low Fit";
  const remote = classifyRemote(job);
  if (remote === "remote") return "Remote Commercial";
  if (remote === "hybrid") return "Hybrid Commercial";
  return "Onsite Commercial";
}

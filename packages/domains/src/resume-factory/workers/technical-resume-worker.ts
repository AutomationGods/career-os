import { createHash } from "node:crypto";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "you",
  "your",
  "our",
  "are",
  "will",
  "job",
  "role",
  "work",
  "team",
  "using",
  "use",
  "into",
  "about",
  "their",
  "they",
  "them",
  "have",
  "has",
  "was",
  "were"
]);

export interface ResumeDraftSection {
  title: string;
  bullets: string[];
}

export interface TechnicalResumeDraftInput {
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  verifiedFacts: string[];
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  targetKeywords?: string[];
  scaffoldPlaceholders?: string[];
}

export interface TechnicalResumeDraft {
  id: string;
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  reviewRequired: true;
  sections: ResumeDraftSection[];
  content: string;
  sourceFacts: string[];
  targetKeywords: string[];
  matchedFactCount: number;
  unmatchedFactCount: number;
  warnings: string[];
}

export function normalizeVerifiedFacts(verifiedFacts: string[]) {
  return [...new Set(verifiedFacts.map((fact) => fact.trim()).filter(Boolean))];
}

export function extractResumeKeywords(input: Pick<TechnicalResumeDraftInput, "targetRole" | "companyName" | "jobDescription" | "targetKeywords">) {
  const text = [input.targetRole, input.companyName, input.jobDescription, ...(input.targetKeywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [...new Set(text.match(/[a-z0-9+#.]+/g) ?? [])]
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 40);
}

function factMatchesKeywords(fact: string, keywords: string[]) {
  const normalizedFact = fact.toLowerCase();
  return keywords.some((keyword) => normalizedFact.includes(keyword));
}

function renderDraftContent(sections: ResumeDraftSection[]) {
  return [
    "Review required: this draft only restates resume-allowed profile_facts.current claims or explicit placeholders.",
    ...sections.flatMap((section) => ["", `## ${section.title}`, ...section.bullets.map((bullet) => `- ${bullet}`)])
  ].join("\n");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

function createDraftId(input: Omit<TechnicalResumeDraft, "id" | "content" | "warnings">) {
  return `resume_draft_${createHash("sha256").update(stableStringify(input)).digest("hex").slice(0, 16)}`;
}

export function buildTechnicalResumeDraft(input: TechnicalResumeDraftInput): TechnicalResumeDraft {
  const sourceFacts = normalizeVerifiedFacts(input.verifiedFacts);
  const targetKeywords = extractResumeKeywords(input);
  const matchedFacts = targetKeywords.length > 0 ? sourceFacts.filter((fact) => factMatchesKeywords(fact, targetKeywords)) : [];
  const matchedSet = new Set(matchedFacts);
  const unmatchedFacts = sourceFacts.filter((fact) => !matchedSet.has(fact));
  const sections: ResumeDraftSection[] = [];

  if (matchedFacts.length > 0) {
    sections.push({ title: "Most relevant verified facts", bullets: matchedFacts });
  }

  if (unmatchedFacts.length > 0) {
    sections.push({ title: "Additional verified facts", bullets: unmatchedFacts });
  }

  const scaffoldPlaceholders = normalizeVerifiedFacts(input.scaffoldPlaceholders ?? []);
  if (scaffoldPlaceholders.length > 0) {
    sections.push({ title: sourceFacts.length > 0 ? "Verification placeholders" : "Profile facts needed", bullets: scaffoldPlaceholders });
  }

  if (sections.length === 0) {
    sections.push({ title: "Profile facts needed", bullets: ["[Add verified employer]", "[Add measurable achievement]", "[Add certification only if verified]", "[Add clearance/public trust only if verified]"] });
  }

  const draftCore = {
    jobId: input.jobId,
    companyId: input.companyId,
    applicationPacketId: input.applicationPacketId,
    resumeVersionId: input.resumeVersionId,
    reviewRequired: true as const,
    sections,
    sourceFacts,
    targetKeywords,
    matchedFactCount: matchedFacts.length,
    unmatchedFactCount: unmatchedFacts.length
  };

  return {
    id: createDraftId(draftCore),
    ...draftCore,
    content: renderDraftContent(sections),
    warnings: [
      "Human review required before export, upload, send, or submission.",
      "Draft bullets are copied from resume-allowed profile facts or explicit placeholders; add no unsupported claims."
    ]
  };
}

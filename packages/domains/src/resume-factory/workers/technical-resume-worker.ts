import { createHash } from "node:crypto";
import { RESUME_SECTION_LABELS, buildResumeReviewChecklist, normalizeSectionOrder, resolveResumeTemplate, type ResumeReviewChecklistItem, type ResumeSectionKey, type ResumeTemplateKey } from "../resume-templates";

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
  key: ResumeSectionKey;
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
  templateKey?: string;
  sectionOrder?: string[];
  blockedProfileClaims?: string[];
}

export interface TechnicalResumeDraft {
  id: string;
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  reviewRequired: true;
  templateKey: ResumeTemplateKey;
  templateName: string;
  sectionOrder: ResumeSectionKey[];
  sections: ResumeDraftSection[];
  content: string;
  sourceFacts: string[];
  targetKeywords: string[];
  missingKeywords: string[];
  matchedFactCount: number;
  unmatchedFactCount: number;
  reviewChecklist: ResumeReviewChecklistItem[];
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

function renderDraftContent(input: { targetRole?: string; companyName?: string; templateName: string; sections: ResumeDraftSection[]; reviewChecklist: ResumeReviewChecklistItem[] }) {
  return [
    `# ${input.targetRole ?? "Targeted Resume Draft"}`,
    input.companyName ? `Target company: ${input.companyName}` : undefined,
    `Template: ${input.templateName}`,
    "Review required: this draft only restates verified facts supplied by the user.",
    ...input.sections.flatMap((section) => ["", `## ${section.title}`, ...section.bullets.map((bullet) => `- ${bullet}`)]),
    "",
    "## Review Checklist",
    ...input.reviewChecklist.map((item, index) => `${index + 1}. ${item.label}: ${item.detail}`)
  ].filter((line): line is string => typeof line === "string").join("\n");
}

function isShortFact(fact: string) {
  return fact.split(/\s+/).filter(Boolean).length <= 5;
}

function isCertificationFact(fact: string) {
  const normalized = fact.toLowerCase();
  return normalized.includes("cert") || normalized.includes("architect") || normalized.includes("admin") || normalized.includes("associate") || normalized.includes("professional");
}

function keywordAppearsInFacts(keyword: string, sourceFacts: string[]) {
  const normalizedKeyword = keyword.toLowerCase();
  return sourceFacts.some((fact) => fact.toLowerCase().includes(normalizedKeyword));
}

function missingKeywords(targetKeywords: string[], sourceFacts: string[]) {
  return targetKeywords.filter((keyword) => !keywordAppearsInFacts(keyword, sourceFacts));
}

function buildSectionBuckets(input: { sourceFacts: string[]; matchedFacts: string[] }) {
  const assigned = new Set<string>();
  const take = (fact: string) => {
    assigned.add(fact);
    return fact;
  };
  const matchedSentenceFacts = input.matchedFacts.filter((fact) => !isShortFact(fact) && !isCertificationFact(fact));
  const summary = matchedSentenceFacts.slice(0, 3).map(take);
  const technicalSkills = input.sourceFacts.filter((fact) => !assigned.has(fact) && isShortFact(fact) && !isCertificationFact(fact)).map(take);
  const certifications = input.sourceFacts.filter((fact) => !assigned.has(fact) && isCertificationFact(fact)).map(take);
  const experienceHighlights = input.sourceFacts.filter((fact) => !assigned.has(fact) && !isShortFact(fact)).map(take);
  const additionalVerifiedFacts = input.sourceFacts.filter((fact) => !assigned.has(fact)).map(take);
  return { summary, technical_skills: technicalSkills, experience_highlights: experienceHighlights, certifications, additional_verified_facts: additionalVerifiedFacts } satisfies Record<ResumeSectionKey, string[]>;
}

function buildSections(sectionOrder: ResumeSectionKey[], buckets: Record<ResumeSectionKey, string[]>) {
  return sectionOrder
    .map((key) => ({ key, title: RESUME_SECTION_LABELS[key], bullets: buckets[key] }))
    .filter((section) => section.bullets.length > 0);
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
  const template = resolveResumeTemplate(input.templateKey);
  const sectionOrder = normalizeSectionOrder(input.sectionOrder, template);
  const buckets = buildSectionBuckets({ sourceFacts, matchedFacts: matchedFacts.length > 0 ? matchedFacts : sourceFacts });
  const sections = buildSections(sectionOrder, buckets);
  const missing = missingKeywords(targetKeywords, sourceFacts);
  const reviewChecklist = buildResumeReviewChecklist({
    matchedFactCount: matchedFacts.length,
    sourceFactCount: sourceFacts.length,
    missingKeywords: missing,
    blockedProfileClaims: input.blockedProfileClaims ?? [],
    templateKey: template.key
  });

  const draftCore = {
    jobId: input.jobId,
    companyId: input.companyId,
    applicationPacketId: input.applicationPacketId,
    resumeVersionId: input.resumeVersionId,
    reviewRequired: true as const,
    templateKey: template.key,
    templateName: template.name,
    sectionOrder,
    sections,
    sourceFacts,
    targetKeywords,
    missingKeywords: missing,
    matchedFactCount: matchedFacts.length,
    unmatchedFactCount: unmatchedFacts.length,
    reviewChecklist
  };

  return {
    id: createDraftId(draftCore),
    ...draftCore,
    content: renderDraftContent({ targetRole: input.targetRole, companyName: input.companyName, templateName: template.name, sections, reviewChecklist }),
    warnings: [
      "Human review required before export, upload, send, or submission.",
      "Draft bullets are copied from verifiedFacts; add no unsupported claims."
    ]
  };
}

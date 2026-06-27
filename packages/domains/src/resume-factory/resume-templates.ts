export const RESUME_SECTION_KEYS = ["summary", "technical_skills", "experience_highlights", "certifications", "additional_verified_facts"] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];
export type ResumeTemplateKey = "ats-technical-v2" | "compact-technical-v2";

export interface ResumeTemplateDefinition {
  key: ResumeTemplateKey;
  name: string;
  description: string;
  defaultSectionOrder: ResumeSectionKey[];
  atsFriendly: true;
}

export interface ResumeReviewChecklistItem {
  id: string;
  label: string;
  status: "pass" | "review" | "blocked";
  detail: string;
}

export const RESUME_SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "Professional Summary",
  technical_skills: "Technical Skills",
  experience_highlights: "Experience Highlights",
  certifications: "Certifications",
  additional_verified_facts: "Additional Verified Facts"
};

export const RESUME_TEMPLATES: ResumeTemplateDefinition[] = [
  {
    key: "ats-technical-v2",
    name: "ATS Technical v2",
    description: "Readable ATS-first technical resume with summary, skills, experience highlights, certifications, and additional verified facts.",
    defaultSectionOrder: ["summary", "technical_skills", "experience_highlights", "certifications", "additional_verified_facts"],
    atsFriendly: true
  },
  {
    key: "compact-technical-v2",
    name: "Compact Technical v2",
    description: "Condensed technical draft that leads with skills and keeps all claims traceable to verified facts.",
    defaultSectionOrder: ["technical_skills", "summary", "experience_highlights", "certifications", "additional_verified_facts"],
    atsFriendly: true
  }
];

const DEFAULT_TEMPLATE = RESUME_TEMPLATES[0];

export function listResumeTemplates() {
  return RESUME_TEMPLATES;
}

export function resolveResumeTemplate(templateKey?: string) {
  return RESUME_TEMPLATES.find((template) => template.key === templateKey) ?? DEFAULT_TEMPLATE;
}

export function normalizeSectionOrder(sectionOrder: string[] | undefined, template = DEFAULT_TEMPLATE): ResumeSectionKey[] {
  const allowed = new Set<ResumeSectionKey>(RESUME_SECTION_KEYS);
  const normalized: ResumeSectionKey[] = [];

  for (const section of sectionOrder ?? []) {
    if (allowed.has(section as ResumeSectionKey) && !normalized.includes(section as ResumeSectionKey)) normalized.push(section as ResumeSectionKey);
  }

  for (const section of template.defaultSectionOrder) {
    if (!normalized.includes(section)) normalized.push(section);
  }

  return normalized;
}

export function buildResumeReviewChecklist(input: {
  matchedFactCount: number;
  sourceFactCount: number;
  missingKeywords: string[];
  blockedProfileClaims: string[];
  templateKey: string;
}): ResumeReviewChecklistItem[] {
  return [
    {
      id: "verified-facts-only",
      label: "Verified facts only",
      status: input.sourceFactCount > 0 ? "pass" : "blocked",
      detail: `${input.sourceFactCount} verified fact(s) supplied to the draft.`
    },
    {
      id: "keyword-alignment",
      label: "Keyword alignment",
      status: input.missingKeywords.length === 0 ? "pass" : "review",
      detail: input.missingKeywords.length === 0 ? "No missing target keywords detected." : `Review missing keywords: ${input.missingKeywords.join(", ")}.`
    },
    {
      id: "blocked-claims",
      label: "Blocked claims are not claimed",
      status: input.blockedProfileClaims.length === 0 ? "pass" : "review",
      detail: input.blockedProfileClaims.length === 0 ? "No blocked Profile Fact claims were supplied." : `Not claimed: ${input.blockedProfileClaims.join(", ")}.`
    },
    {
      id: "ats-template",
      label: "ATS-friendly structure",
      status: "pass",
      detail: `Template ${input.templateKey} uses simple headings and text-only sections.`
    },
    {
      id: "human-review-required",
      label: "Human review required",
      status: "review",
      detail: "Verify employer names, dates, metrics, and job-specific wording before external use."
    }
  ];
}

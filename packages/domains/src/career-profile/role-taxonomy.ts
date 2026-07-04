export type UrgentRoleFamilyId = "splunk" | "cribl" | "siem" | "cybersecurity_engineering" | "security_operations" | "detection_engineering" | "observability" | "cloud_security" | "linux_security" | "arcsight";

export interface UrgentRoleFamily {
  id: UrgentRoleFamilyId;
  allowedTargetTitles: string[];
  requiredPositiveKeywords: string[];
  strongPositiveKeywords: string[];
  weakPositiveKeywords: string[];
  negativeKeywords: string[];
  disqualifyingTitleTerms: string[];
}

export interface TargetNormalizationInputFact {
  category: string;
  claim: string;
  truthStatus?: string;
}

export interface TargetNormalizationResult {
  cleanTargetTitles: string[];
  suggestedJobSearchKeywords: string[];
  excludedKeywords: string[];
  companiesExcludedFromSearch: string[];
  certificationsExcludedAsTitles: string[];
  ignoredResumeLinesForSearch: string[];
  certificationsKeptOutOfTitleSearch: string[];
  certificationsUsedAsSearchKeywords: string[];
}

export interface JobSourceDiagnostic {
  enabledSources: string[];
  disabledSources: string[];
}

export interface JobFitEvaluation {
  passed: boolean;
  score: number;
  status: "ranked" | "not_fit";
  matchedStrongKeywords: string[];
  matchedWeakKeywords: string[];
  matchedFamilies: UrgentRoleFamilyId[];
  missingRequiredContext: string[];
  risks: string[];
  rejectionReason?: string;
}

export const defaultUrgentSearchTitles = [
  "Splunk Architect",
  "Splunk Administrator",
  "Splunk Consultant",
  "Splunk Engineer",
  "SIEM Engineer",
  "Cybersecurity Engineer Splunk",
  "Detection Engineer Splunk",
  "Cribl Engineer",
  "Security Operations Engineer Splunk",
  "Observability Engineer Splunk"
];

export const disqualifyingTitleTerms = [
  "sales assistant",
  "customer success",
  "client success",
  "product manager",
  "video editor",
  "communications manager",
  "marketing manager",
  "social media",
  "content editor",
  "frontend engineer",
  "react engineer",
  "quality engineer",
  "qa engineer"
];

const weakPositiveKeywords = ["automation", "aws", "azure", "python", "github", "docker", "kubernetes", "cloud", "observability"];

export const urgentRoleTaxonomy: UrgentRoleFamily[] = [
  {
    id: "splunk",
    allowedTargetTitles: ["Splunk Architect", "Splunk Administrator", "Splunk Consultant", "Splunk Engineer", "Splunk Cloud Engineer"],
    requiredPositiveKeywords: ["splunk"],
    strongPositiveKeywords: ["splunk", "splunk enterprise", "splunk cloud", "splunk enterprise security", "splunk es", "search head", "indexer", "forwarder", "spl", "cim", "technology add-on", "log onboarding"],
    weakPositiveKeywords,
    negativeKeywords: ["sales assistant", "customer success", "product manager", "video editor", "communications manager", "react", "frontend"],
    disqualifyingTitleTerms
  },
  {
    id: "cribl",
    allowedTargetTitles: ["Cribl Engineer", "Cribl Consultant"],
    requiredPositiveKeywords: ["cribl"],
    strongPositiveKeywords: ["cribl", "cribl stream", "cribl edge", "logstream", "pipeline", "log routing"],
    weakPositiveKeywords,
    negativeKeywords: ["sales assistant", "customer success", "product manager", "video editor"],
    disqualifyingTitleTerms
  },
  {
    id: "siem",
    allowedTargetTitles: ["SIEM Engineer", "SOC Engineer", "Log Management Engineer"],
    requiredPositiveKeywords: ["siem"],
    strongPositiveKeywords: ["siem", "soc", "security information and event management", "log management", "syslog", "correlation rule", "security monitoring"],
    weakPositiveKeywords,
    negativeKeywords: ["frontend", "react", "sales", "marketing"],
    disqualifyingTitleTerms
  },
  {
    id: "cybersecurity_engineering",
    allowedTargetTitles: ["Cybersecurity Engineer", "Security Engineer", "Cloud Security Engineer", "Linux Security Engineer"],
    requiredPositiveKeywords: ["cybersecurity", "security engineer", "security engineering"],
    strongPositiveKeywords: ["cybersecurity", "security engineering", "security engineer", "incident response", "vulnerability", "threat", "security operations"],
    weakPositiveKeywords,
    negativeKeywords: ["sales", "marketing", "communications"],
    disqualifyingTitleTerms
  },
  {
    id: "security_operations",
    allowedTargetTitles: ["Security Operations Engineer", "SOC Engineer"],
    requiredPositiveKeywords: ["security operations", "soc"],
    strongPositiveKeywords: ["security operations", "soc", "incident response", "alert triage", "security monitoring", "threat hunting"],
    weakPositiveKeywords,
    negativeKeywords: ["customer success", "client success", "sales"],
    disqualifyingTitleTerms
  },
  {
    id: "detection_engineering",
    allowedTargetTitles: ["Detection Engineer", "Threat Detection Engineer"],
    requiredPositiveKeywords: ["detection", "threat detection"],
    strongPositiveKeywords: ["detection engineering", "threat detection", "detection engineer", "detection logic", "sigma", "yara", "correlation", "spl"],
    weakPositiveKeywords,
    negativeKeywords: ["video editor", "content editor", "product manager"],
    disqualifyingTitleTerms
  },
  {
    id: "observability",
    allowedTargetTitles: ["Observability Engineer", "Log Management Engineer"],
    requiredPositiveKeywords: ["log management", "telemetry", "syslog", "splunk", "cribl"],
    strongPositiveKeywords: ["log management", "telemetry pipeline", "security telemetry", "logs", "syslog", "splunk", "cribl"],
    weakPositiveKeywords,
    negativeKeywords: ["marketing", "communications", "social media"],
    disqualifyingTitleTerms
  },
  {
    id: "cloud_security",
    allowedTargetTitles: ["Cloud Security Engineer"],
    requiredPositiveKeywords: ["cloud security"],
    strongPositiveKeywords: ["cloud security", "aws security", "azure security", "iam", "guardduty", "sentinel", "security hub"],
    weakPositiveKeywords,
    negativeKeywords: ["frontend", "react", "sales"],
    disqualifyingTitleTerms
  },
  {
    id: "linux_security",
    allowedTargetTitles: ["Linux Security Engineer"],
    requiredPositiveKeywords: ["linux security"],
    strongPositiveKeywords: ["linux security", "linux hardening", "auditd", "syslog", "security monitoring", "endpoint security"],
    weakPositiveKeywords,
    negativeKeywords: ["frontend", "react", "marketing"],
    disqualifyingTitleTerms
  },
  {
    id: "arcsight",
    allowedTargetTitles: ["ArcSight Engineer"],
    requiredPositiveKeywords: ["arcsight"],
    strongPositiveKeywords: ["arcsight", "esm", "logger", "connector", "siem"],
    weakPositiveKeywords,
    negativeKeywords: ["sales", "customer success", "product manager"],
    disqualifyingTitleTerms
  }
];

export const enabledCareerCommandJobSources = ["Remotive public API", "Manual Job Import"];
export const disabledCareerCommandJobSources = ["LinkedIn scraping", "Indeed scraping", "Dice scraping", "ClearanceJobs scraping", "Gmail", "Google Calendar", "browser automation", "auto-apply", "CAPTCHA bypass"];

export const careerCommandManualSearchQueries = [
  "Splunk Architect remote",
  "Splunk Administrator contract",
  "Splunk Consultant SIEM",
  "Splunk Engineer federal",
  "Splunk Cloud Engineer",
  "Splunk Enterprise Security Engineer",
  "Cribl Engineer remote",
  "Cribl Consultant",
  "SIEM Engineer Splunk",
  "Detection Engineer Splunk",
  "Security Operations Engineer Splunk",
  "Cybersecurity Engineer Splunk",
  "ArcSight Engineer",
  "Cloud Security Splunk",
  "Log Management Engineer"
];

export const careerCommandManualSearchSites = ["LinkedIn", "Dice", "Indeed", "ClearanceJobs only for government/public-trust/clearance-adjacent roles", "ZipRecruiter", "Built In", "company career pages", "recruiter agency sites"];

const allAllowedTitles = urgentRoleTaxonomy.flatMap((family) => family.allowedTargetTitles);
const allStrongKeywords = urgentRoleTaxonomy.flatMap((family) => family.strongPositiveKeywords);
const allWeakKeywords = [...new Set(urgentRoleTaxonomy.flatMap((family) => family.weakPositiveKeywords))];
const certificationTerms = /\b(splunk enterprise certified|security\+|cissp|network\+|comptia|aws certified|azure fundamentals|pmp|cka|ckad|certified)\b/i;
const dateTerms = /\b(19\d{2}|20\d{2}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;
const educationTerms = /\b(degree|bachelors?|masters?|mba|phd|university|college)\b/i;
const employerLineTerms = /\||\b(inc|llc|corp|corporation|ltd|cyber llc|technology|peraton|dell|shorepoint|dxc)\b/i;

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function lower(value: string) {
  return value.toLowerCase();
}

function escapedRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesPhrase(text: string, phrase: string) {
  return new RegExp(`(^|[^a-z0-9+#/])${escapedRegex(lower(phrase))}([^a-z0-9+#/]|$)`, "i").test(lower(text));
}

function titleFromSplunkContext(text: string) {
  const normalized = lower(text);
  if (certificationTerms.test(text)) return [];
  const titles: string[] = [];
  if (normalized.includes("splunk") && normalized.includes("architect")) titles.push("Splunk Architect");
  if (normalized.includes("splunk") && normalized.includes("administrator")) titles.push("Splunk Administrator");
  if (normalized.includes("splunk") && normalized.includes("consultant")) titles.push("Splunk Consultant");
  if (normalized.includes("splunk") && normalized.includes("engineer")) titles.push("Splunk Engineer");
  if (normalized.includes("splunk cloud")) titles.push("Splunk Cloud Engineer");
  return titles;
}

function titlesFromText(text: string) {
  if (!text || certificationTerms.test(text) || educationTerms.test(text) || dateTerms.test(text)) return [];
  return unique([
    ...allAllowedTitles.filter((title) => includesPhrase(text, title)),
    ...titleFromSplunkContext(text),
    lower(text).includes("cribl") && lower(text).includes("engineer") ? "Cribl Engineer" : "",
    lower(text).includes("cribl") && lower(text).includes("consultant") ? "Cribl Consultant" : "",
    lower(text).includes("siem") && lower(text).includes("engineer") ? "SIEM Engineer" : "",
    lower(text).includes("cybersecurity engineer") ? "Cybersecurity Engineer" : "",
    lower(text).includes("security engineer") ? "Security Engineer" : "",
    lower(text).includes("security operations") ? "Security Operations Engineer" : "",
    lower(text).includes("soc") && lower(text).includes("engineer") ? "SOC Engineer" : "",
    lower(text).includes("detection") && lower(text).includes("engineer") ? "Detection Engineer" : "",
    lower(text).includes("arcsight") ? "ArcSight Engineer" : ""
  ]);
}

function companyFromEmployerClaim(claim: string) {
  const withoutPrefix = claim.replace(/^employer:\s*/i, "").trim();
  const beforeDelimiter = withoutPrefix.split(/\||,|—| - /)[0]?.trim();
  return beforeDelimiter && beforeDelimiter.length <= 80 ? beforeDelimiter : undefined;
}

function keywordHintsFromCertifications(certifications: string[]) {
  const hints = [...certifications];
  for (const certification of certifications) {
    const normalized = lower(certification);
    if (normalized.includes("splunk enterprise")) hints.push("splunk enterprise");
    if (normalized.includes("splunk")) hints.push("splunk");
    if (normalized.includes("security+")) hints.push("security operations");
    if (normalized.includes("cissp")) hints.push("cybersecurity");
  }
  return hints;
}

export function normalizeCareerTargets(facts: TargetNormalizationInputFact[]): TargetNormalizationResult {
  const titles: string[] = [];
  const ignoredResumeLinesForSearch: string[] = [];
  const companiesExcludedFromSearch: string[] = [];
  const certificationsUsedAsSearchKeywords: string[] = [];

  for (const fact of facts) {
    const claim = fact.claim.trim();
    if (!claim || fact.truthStatus === "blocked" || fact.truthStatus === "rejected") continue;

    if (fact.category === "certification" || certificationTerms.test(claim)) {
      certificationsUsedAsSearchKeywords.push(claim.replace(/^job title:\s*/i, "").replace(/^[-*•]\s*/, "").trim());
      continue;
    }

    if (claim.startsWith("Employer:")) {
      const company = companyFromEmployerClaim(claim);
      if (company) companiesExcludedFromSearch.push(company);
      ignoredResumeLinesForSearch.push(claim);
      titles.push(...titlesFromText(claim));
      continue;
    }

    if (fact.category === "education" || educationTerms.test(claim) || fact.category === "achievement" || claim.length > 120) {
      ignoredResumeLinesForSearch.push(claim);
      continue;
    }

    if (employerLineTerms.test(claim)) ignoredResumeLinesForSearch.push(claim);
    titles.push(...titlesFromText(claim));
  }

  const cleanTargetTitles = unique([...titles, ...defaultUrgentSearchTitles]).slice(0, 18);
  return {
    cleanTargetTitles,
    suggestedJobSearchKeywords: unique([...keywordHintsFromCertifications(certificationsUsedAsSearchKeywords), ...cleanTargetTitles, "siem", "security operations", "detection engineering", "log management"]).slice(0, 24),
    excludedKeywords: unique(ignoredResumeLinesForSearch),
    companiesExcludedFromSearch: unique(companiesExcludedFromSearch),
    certificationsExcludedAsTitles: [],
    ignoredResumeLinesForSearch: unique(ignoredResumeLinesForSearch),
    certificationsKeptOutOfTitleSearch: unique(certificationsUsedAsSearchKeywords),
    certificationsUsedAsSearchKeywords: unique(certificationsUsedAsSearchKeywords)
  };
}

export function selectCleanDiscoveryQueries(profile?: { targetTitles?: string[]; fastestRoleTargets?: string[]; suggestedJobSearchKeywords?: string[] }) {
  const roleCandidates = unique([...(profile?.fastestRoleTargets ?? []), ...(profile?.targetTitles ?? [])]).filter((candidate) => titlesFromText(candidate).length > 0 && !certificationTerms.test(candidate) && !employerLineTerms.test(candidate));
  const certificationCandidates = (profile?.suggestedJobSearchKeywords ?? []).filter((keyword) => certificationTerms.test(keyword));
  const fallbackCandidates = roleCandidates.length > 0 ? defaultUrgentSearchTitles : [...certificationCandidates, ...defaultUrgentSearchTitles];
  return unique([...roleCandidates, ...fallbackCandidates]).filter((candidate) => (titlesFromText(candidate).length > 0 || certificationTerms.test(candidate)) && !employerLineTerms.test(candidate)).slice(0, 5);
}

export function buildCareerCommandSourceDiagnostic(): JobSourceDiagnostic {
  return { enabledSources: enabledCareerCommandJobSources, disabledSources: disabledCareerCommandJobSources };
}

export function evaluateJobFit(input: { title: string; description?: string; explicitBroadRoleFamily?: boolean }): JobFitEvaluation {
  const title = input.title.trim();
  const text = `${title} ${input.description ?? ""}`.toLowerCase();
  const titleLower = title.toLowerCase();
  const matchedStrongKeywords = unique(allStrongKeywords.filter((keyword) => includesPhrase(text, keyword)));
  const matchedWeakKeywords = unique(allWeakKeywords.filter((keyword) => includesPhrase(text, keyword)));
  const titleMatchedFamilies = urgentRoleTaxonomy.filter((family) => family.allowedTargetTitles.some((targetTitle) => includesPhrase(titleLower, targetTitle))).map((family) => family.id);
  const contextMatchedFamilies = urgentRoleTaxonomy.filter((family) => family.strongPositiveKeywords.some((keyword) => includesPhrase(text, keyword))).map((family) => family.id);
  const matchedFamilies = unique([...titleMatchedFamilies, ...contextMatchedFamilies]) as UrgentRoleFamilyId[];
  const disqualifiedTitle = disqualifyingTitleTerms.find((term) => includesPhrase(titleLower, term));
  const strictlyDisqualifiedTitle = disqualifiedTitle && !["quality engineer", "qa engineer"].includes(disqualifiedTitle);
  const hasStrongContext = matchedStrongKeywords.length > 0;
  const hasTargetTitle = titleMatchedFamilies.length > 0;
  const passed = Boolean(input.explicitBroadRoleFamily || hasTargetTitle || hasStrongContext) && !Boolean(disqualifiedTitle && !hasStrongContext && !input.explicitBroadRoleFamily) && !Boolean(strictlyDisqualifiedTitle && !input.explicitBroadRoleFamily);

  if (!passed) {
    const rejectionReason = disqualifiedTitle ? `disqualifying_title:${disqualifiedTitle}` : "low_relevance:no_target_role_or_strong_context";
    return {
      passed: false,
      score: 0,
      status: "not_fit",
      matchedStrongKeywords,
      matchedWeakKeywords,
      matchedFamilies,
      missingRequiredContext: ["role_mismatch: needs Splunk, Cribl, SIEM, cybersecurity, security operations, detection, observability, cloud security, Linux security, or ArcSight context"],
      risks: ["role_mismatch", "low_relevance"],
      rejectionReason
    };
  }

  const titlePoints = hasTargetTitle ? 25 : 0;
  const strongPoints = Math.min(55, matchedStrongKeywords.length * 9);
  const weakPoints = Math.min(12, matchedWeakKeywords.length * 2);
  const score = Math.min(100, 30 + titlePoints + strongPoints + weakPoints);
  return {
    passed: true,
    score,
    status: "ranked",
    matchedStrongKeywords,
    matchedWeakKeywords,
    matchedFamilies,
    missingRequiredContext: [],
    risks: score < 50 ? ["low_relevance"] : [],
    rejectionReason: undefined
  };
}

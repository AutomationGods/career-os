export type SafeSearchPatternCategory =
  | "ats_job_discovery"
  | "company_career_page_discovery"
  | "splunk_jobs"
  | "cribl_jobs"
  | "siem_jobs"
  | "remote_devops_jobs"
  | "recruiter_discovery"
  | "hiring_manager_discovery"
  | "company_technology_signals";

export interface SearchPatternGuardrails {
  requiresManualReview: true;
  noLoginBypass: true;
  noLinkedInScraping: true;
  noAutomatedExecution: true;
}

export interface SafeSearchPatternRecord {
  id: string;
  category: SafeSearchPatternCategory;
  label: string;
  intent: string;
  manualPatternExamples: string[];
  evidenceToCapture: string[];
  guardrails: SearchPatternGuardrails;
}

export interface CompanyReconChecklistItem {
  id: string;
  label: string;
  evidenceType: string;
  stateProjectionHint: string;
  guardrails: SearchPatternGuardrails;
}

export const defaultSearchPatternGuardrails: SearchPatternGuardrails = {
  requiresManualReview: true,
  noLoginBypass: true,
  noLinkedInScraping: true,
  noAutomatedExecution: true
};

export const safeSearchPatternCategories: SafeSearchPatternCategory[] = [
  "ats_job_discovery",
  "company_career_page_discovery",
  "splunk_jobs",
  "cribl_jobs",
  "siem_jobs",
  "remote_devops_jobs",
  "recruiter_discovery",
  "hiring_manager_discovery",
  "company_technology_signals"
];

export const safeSearchPatterns: SafeSearchPatternRecord[] = [
  {
    id: "ats-job-discovery",
    category: "ats_job_discovery",
    label: "ATS job discovery",
    intent: "Plan manual searches for public ATS-hosted jobs without logging in or scraping protected pages.",
    manualPatternExamples: ["site:greenhouse.io DevOps remote Splunk", "site:lever.co SRE Cribl", "site:ashbyhq.com platform engineer SIEM"],
    evidenceToCapture: ["public job URL", "company name", "role title", "posted date when visible", "ATS source"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "company-career-page-discovery",
    category: "company_career_page_discovery",
    label: "Company career page discovery",
    intent: "Plan manual discovery of first-party career pages and public role indexes.",
    manualPatternExamples: ["site:company.com/careers Splunk", "site:company.com/jobs DevOps remote", "company name careers security engineer"],
    evidenceToCapture: ["career page URL", "role URL", "company domain", "public source timestamp"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "splunk-jobs",
    category: "splunk_jobs",
    label: "Splunk jobs",
    intent: "Plan manual searches for roles that mention Splunk administration, observability, or SIEM operations.",
    manualPatternExamples: ["Splunk engineer remote job", "site:greenhouse.io Splunk platform engineer", "\"Splunk\" \"DevOps\" \"remote\""],
    evidenceToCapture: ["role URL", "Splunk requirement text", "seniority", "remote/hybrid signal"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "cribl-jobs",
    category: "cribl_jobs",
    label: "Cribl jobs",
    intent: "Plan manual searches for roles mentioning Cribl Stream, telemetry pipelines, or observability routing.",
    manualPatternExamples: ["Cribl engineer remote job", "\"Cribl Stream\" \"platform engineer\"", "site:lever.co Cribl observability"],
    evidenceToCapture: ["role URL", "Cribl requirement text", "observability stack", "source"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "siem-jobs",
    category: "siem_jobs",
    label: "SIEM jobs",
    intent: "Plan manual searches for SIEM engineering, detection, and security operations roles.",
    manualPatternExamples: ["SIEM engineer remote", "\"security operations\" \"Splunk\" \"remote\"", "site:ashbyhq.com SIEM engineer"],
    evidenceToCapture: ["role URL", "SIEM platform named", "security clearance signal", "remote/hybrid signal"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "remote-devops-jobs",
    category: "remote_devops_jobs",
    label: "Remote DevOps jobs",
    intent: "Plan manual discovery of remote DevOps, SRE, platform, and infrastructure roles.",
    manualPatternExamples: ["remote DevOps Terraform AWS job", "site:greenhouse.io remote SRE Kubernetes", "\"platform engineer\" \"remote\" \"Terraform\""],
    evidenceToCapture: ["role URL", "remote policy", "core stack", "employment type"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "recruiter-discovery",
    category: "recruiter_discovery",
    label: "Recruiter discovery",
    intent: "Plan manual identification of public recruiter contacts without scraping LinkedIn or auto-contacting anyone.",
    manualPatternExamples: ["company recruiter email careers", "site:company.com recruiter talent acquisition", "company talent acquisition team"],
    evidenceToCapture: ["public profile URL", "company team page", "role/function", "contact source if public"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "hiring-manager-discovery",
    category: "hiring_manager_discovery",
    label: "Hiring manager discovery",
    intent: "Plan manual discovery of likely hiring teams from public company pages, talks, repos, and engineering blogs.",
    manualPatternExamples: ["company engineering manager observability", "site:company.com/blog Splunk platform team", "company SRE manager Kubernetes"],
    evidenceToCapture: ["public source URL", "team association", "role title", "confidence note"],
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "company-technology-signals",
    category: "company_technology_signals",
    label: "Company technology signals",
    intent: "Plan manual OSINT checks for public technology adoption signals relevant to target roles.",
    manualPatternExamples: ["site:company.com/blog Splunk", "site:company.com/blog Kubernetes Terraform", "company engineering blog Cribl observability"],
    evidenceToCapture: ["signal URL", "technology mentioned", "team context", "recency"],
    guardrails: defaultSearchPatternGuardrails
  }
];

export const companyReconChecklist: CompanyReconChecklistItem[] = [
  {
    id: "career-surface",
    label: "Public career surface",
    evidenceType: "career_page",
    stateProjectionHint: "research.company_recon.career_surface",
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "hiring-stack",
    label: "Public hiring stack",
    evidenceType: "ats_or_job_board",
    stateProjectionHint: "research.company_recon.hiring_stack",
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "technology-stack",
    label: "Public technology stack signals",
    evidenceType: "technology_signal",
    stateProjectionHint: "research.company_recon.technology_signals",
    guardrails: defaultSearchPatternGuardrails
  },
  {
    id: "people-map",
    label: "Public people map",
    evidenceType: "public_people_signal",
    stateProjectionHint: "research.company_recon.people_map",
    guardrails: defaultSearchPatternGuardrails
  }
];

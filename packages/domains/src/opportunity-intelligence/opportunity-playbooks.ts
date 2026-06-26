import type { SearchPatternGuardrails } from "../research/search-intelligence-playbooks";
import { defaultSearchPatternGuardrails } from "../research/search-intelligence-playbooks";

export type OpportunityPlaybookType = "hidden_job_discovery" | "hiring_signal_detection";

export interface OpportunityPlaybookAction {
  id: string;
  label: string;
  description: string;
  sourceTypes: string[];
  outputEvent: string;
  stateProjection: string;
  guardrails: SearchPatternGuardrails & {
    noAutoSubmit: true;
    noExternalExecution: true;
  };
}

export interface OpportunityPlaybook {
  id: string;
  type: OpportunityPlaybookType;
  capability: string;
  command: string;
  plannedEvent: string;
  plannedStateProjection: string;
  actions: OpportunityPlaybookAction[];
}

export const opportunityPlaybookGuardrails = {
  ...defaultSearchPatternGuardrails,
  noAutoSubmit: true,
  noExternalExecution: true
} as const;

export const hiddenJobDiscoveryPlaybook: OpportunityPlaybook = {
  id: "hidden-job-discovery",
  type: "hidden_job_discovery",
  capability: "HiddenJobDiscoveryCapability",
  command: "opportunity.hidden_jobs.plan",
  plannedEvent: "opportunity.hidden_jobs_planned",
  plannedStateProjection: "opportunity.hidden_opportunities.planned",
  actions: [
    {
      id: "public-career-cross-check",
      label: "Public career-page cross-check",
      description: "Compare public company career pages, ATS pages, and job-board snippets by hand to find roles not yet in the local pipeline.",
      sourceTypes: ["career_page", "ats_public_job", "public_job_board"],
      outputEvent: "opportunity.hidden_jobs_planned",
      stateProjection: "opportunity.hidden_opportunities.planned",
      guardrails: opportunityPlaybookGuardrails
    },
    {
      id: "target-stack-role-watch",
      label: "Target-stack role watch",
      description: "Plan manual review of roles mentioning Splunk, Cribl, SIEM, Terraform, Kubernetes, AWS, or observability keywords.",
      sourceTypes: ["public_search_result", "public_company_blog", "ats_public_job"],
      outputEvent: "opportunity.hidden_jobs_planned",
      stateProjection: "opportunity.hidden_opportunities.planned",
      guardrails: opportunityPlaybookGuardrails
    }
  ]
};

export const hiringSignalDetectionPlaybook: OpportunityPlaybook = {
  id: "hiring-signal-detection",
  type: "hiring_signal_detection",
  capability: "HiringSignalDetectionCapability",
  command: "opportunity.hiring_signals.plan",
  plannedEvent: "opportunity.hiring_signals_planned",
  plannedStateProjection: "opportunity.hiring_signals.planned",
  actions: [
    {
      id: "public-growth-signal-review",
      label: "Public growth-signal review",
      description: "Plan manual review of public funding, product launch, hiring post, and engineering-blog signals that may indicate upcoming openings.",
      sourceTypes: ["public_news", "company_blog", "public_press_release", "public_social_post"],
      outputEvent: "opportunity.hiring_signals_planned",
      stateProjection: "opportunity.hiring_signals.planned",
      guardrails: opportunityPlaybookGuardrails
    },
    {
      id: "team-expansion-signal-review",
      label: "Team expansion signal review",
      description: "Plan manual capture of team-expansion language from public roles and company pages without contacting or scraping people.",
      sourceTypes: ["career_page", "ats_public_job", "company_about_page"],
      outputEvent: "opportunity.hiring_signals_planned",
      stateProjection: "opportunity.hiring_signals.planned",
      guardrails: opportunityPlaybookGuardrails
    }
  ]
};

export const opportunityPlaybooks = [hiddenJobDiscoveryPlaybook, hiringSignalDetectionPlaybook] as const;
export const opportunityStateProjectionNames = ["opportunity.hidden_opportunities.planned", "opportunity.hiring_signals.planned"] as const;

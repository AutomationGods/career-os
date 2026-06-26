import type { SearchPatternGuardrails } from "../research/search-intelligence-playbooks";
import { defaultSearchPatternGuardrails } from "../research/search-intelligence-playbooks";

export type RelationshipDiscoveryType = "recruiter_discovery" | "hiring_manager_discovery";

export interface RelationshipDiscoveryGuardrails extends SearchPatternGuardrails {
  noAutoContact: true;
  noEmailSending: true;
}

export interface RelationshipDiscoveryPlaybook {
  id: string;
  type: RelationshipDiscoveryType;
  capability: string;
  command: string;
  plannedEvent: string;
  stateProjection: string;
  discoveryOnly: true;
  allowedSourceTypes: string[];
  prohibitedActions: string[];
  guardrails: RelationshipDiscoveryGuardrails;
}

export const relationshipDiscoveryGuardrails: RelationshipDiscoveryGuardrails = {
  ...defaultSearchPatternGuardrails,
  noAutoContact: true,
  noEmailSending: true
};

export const recruiterDiscoveryPlaybook: RelationshipDiscoveryPlaybook = {
  id: "recruiter-discovery",
  type: "recruiter_discovery",
  capability: "RecruiterDiscoveryCapability",
  command: "relationships.discover_recruiters.plan",
  plannedEvent: "relationship.recruiter_discovery_planned",
  stateProjection: "relationship.recruiter_discovery.planned",
  discoveryOnly: true,
  allowedSourceTypes: ["company_team_page", "public_careers_page", "public_event_page", "public_recruiting_post"],
  prohibitedActions: ["linkedin_scraping", "login_bypass", "auto_contact", "email_sending", "profile_enrichment_api_call"],
  guardrails: relationshipDiscoveryGuardrails
};

export const hiringManagerDiscoveryPlaybook: RelationshipDiscoveryPlaybook = {
  id: "hiring-manager-discovery",
  type: "hiring_manager_discovery",
  capability: "HiringManagerDiscoveryCapability",
  command: "relationships.discover_hiring_managers.plan",
  plannedEvent: "relationship.hiring_manager_discovery_planned",
  stateProjection: "relationship.hiring_manager_discovery.planned",
  discoveryOnly: true,
  allowedSourceTypes: ["company_engineering_blog", "public_team_page", "conference_talk_page", "open_source_repo_metadata"],
  prohibitedActions: ["linkedin_scraping", "login_bypass", "auto_contact", "email_sending", "browser_automation"],
  guardrails: relationshipDiscoveryGuardrails
};

export const relationshipDiscoveryPlaybooks = [recruiterDiscoveryPlaybook, hiringManagerDiscoveryPlaybook] as const;

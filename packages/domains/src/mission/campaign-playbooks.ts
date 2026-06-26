import type { SearchPatternGuardrails } from "../research/search-intelligence-playbooks";
import { defaultSearchPatternGuardrails } from "../research/search-intelligence-playbooks";

export interface CampaignTrackingGuardrails extends SearchPatternGuardrails {
  noAutoSubmit: true;
  noAutoContact: true;
  noExternalExecution: true;
}

export interface CampaignTrackingPlaybook {
  id: string;
  capability: string;
  command: string;
  plannedEvent: string;
  stateProjection: string;
  trackedInputs: string[];
  plannedOutputs: string[];
  guardrails: CampaignTrackingGuardrails;
}

export const campaignTrackingGuardrails: CampaignTrackingGuardrails = {
  ...defaultSearchPatternGuardrails,
  noAutoSubmit: true,
  noAutoContact: true,
  noExternalExecution: true
};

export const searchCampaignStateProjection = "mission.search_campaigns.planned";

export const campaignTrackingPlaybook: CampaignTrackingPlaybook = {
  id: "campaign-tracking",
  capability: "CampaignTrackingCapability",
  command: "mission.campaign_tracking.plan",
  plannedEvent: "mission.campaign_tracking_planned",
  stateProjection: searchCampaignStateProjection,
  trackedInputs: [
    "target_role_family",
    "target_company_list",
    "safe_search_pattern_ids",
    "planned_relationship_discovery_ids",
    "hidden_opportunity_ids",
    "hiring_signal_ids"
  ],
  plannedOutputs: [
    "manual_search_queue",
    "company_recon_queue",
    "relationship_discovery_queue",
    "candidate_opportunity_review_queue"
  ],
  guardrails: campaignTrackingGuardrails
};

import type { DomainDefinition } from "@career-os/shared";
import { definition as orchestration } from "./orchestration/manager";
import { definition as system_kernel } from "./system-kernel/manager";
import { definition as configuration } from "./configuration/manager";
import { definition as security } from "./security/manager";
import { definition as trust_and_safety } from "./trust-and-safety/manager";
import { definition as recovery } from "./recovery/manager";
import { definition as scheduler } from "./scheduler/manager";
import { definition as notification } from "./notification/manager";
import { definition as integration } from "./integration/manager";
import { definition as ai } from "./ai/manager";
import { definition as reasoning } from "./reasoning/manager";
import { definition as knowledge } from "./knowledge/manager";
import { definition as memory } from "./memory/manager";
import { definition as observability } from "./observability/manager";
import { definition as qa } from "./qa/manager";
import { definition as privacy } from "./privacy/manager";
import { definition as workflow } from "./workflow/manager";
import { definition as mission } from "./mission/manager";
import { definition as event_store } from "./event-store/manager";
import { definition as state_store } from "./state-store/manager";
import { definition as snapshot_store } from "./snapshot-store/manager";
import { definition as document_intelligence } from "./document-intelligence/manager";
import { definition as identity } from "./identity/manager";
import { definition as user_crm } from "./user-crm/manager";
import { definition as relationship_intelligence } from "./relationship-intelligence/manager";
import { definition as company_intelligence } from "./company-intelligence/manager";
import { definition as market_intelligence } from "./market-intelligence/manager";
import { definition as opportunity_intelligence } from "./opportunity-intelligence/manager";
import { definition as career_page } from "./career-page/manager";
import { definition as ats_intelligence } from "./ats-intelligence/manager";
import { definition as job_discovery } from "./job-discovery/manager";
import { definition as job_normalization } from "./job-normalization/manager";
import { definition as job_intelligence } from "./job-intelligence/manager";
import { definition as fit_scoring } from "./fit-scoring/manager";
import { definition as application_difficulty } from "./application-difficulty/manager";
import { definition as clearance_segmentation } from "./clearance-segmentation/manager";
import { definition as remote_classification } from "./remote-classification/manager";
import { definition as certification_intelligence } from "./certification-intelligence/manager";
import { definition as salary_intelligence } from "./salary-intelligence/manager";
import { definition as resume_factory } from "./resume-factory/manager";
import { definition as resume_template } from "./resume-template/manager";
import { definition as cover_letter } from "./cover-letter/manager";
import { definition as application_packet } from "./application-packet/manager";
import { definition as document_export } from "./document-export/manager";
import { definition as communications } from "./communications/manager";
import { definition as email_intelligence } from "./email-intelligence/manager";
import { definition as browser_infrastructure } from "./browser-infrastructure/manager";
import { definition as browser_copilot } from "./browser-copilot/manager";
import { definition as calendar_intelligence } from "./calendar-intelligence/manager";
import { definition as interview_preparation } from "./interview-preparation/manager";
import { definition as interview_follow_up } from "./interview-follow-up/manager";
import { definition as follow_up_automation } from "./follow-up-automation/manager";
import { definition as offer_negotiation } from "./offer-negotiation/manager";
import { definition as learning } from "./learning/manager";
import { definition as skill_gap_intelligence } from "./skill-gap-intelligence/manager";
import { definition as career_strategy } from "./career-strategy/manager";
import { definition as finance } from "./finance/manager";
import { definition as research } from "./research/manager";
import { definition as portfolio } from "./portfolio/manager";
import { definition as referral } from "./referral/manager";
import { definition as reputation } from "./reputation/manager";
import { definition as simulation } from "./simulation/manager";

export const domainRegistry: DomainDefinition[] = [
  orchestration,
  system_kernel,
  configuration,
  security,
  trust_and_safety,
  recovery,
  scheduler,
  notification,
  integration,
  ai,
  reasoning,
  knowledge,
  memory,
  observability,
  qa,
  privacy,
  workflow,
  mission,
  event_store,
  state_store,
  snapshot_store,
  document_intelligence,
  identity,
  user_crm,
  relationship_intelligence,
  company_intelligence,
  market_intelligence,
  opportunity_intelligence,
  career_page,
  ats_intelligence,
  job_discovery,
  job_normalization,
  job_intelligence,
  fit_scoring,
  application_difficulty,
  clearance_segmentation,
  remote_classification,
  certification_intelligence,
  salary_intelligence,
  resume_factory,
  resume_template,
  cover_letter,
  application_packet,
  document_export,
  communications,
  email_intelligence,
  browser_infrastructure,
  browser_copilot,
  calendar_intelligence,
  interview_preparation,
  interview_follow_up,
  follow_up_automation,
  offer_negotiation,
  learning,
  skill_gap_intelligence,
  career_strategy,
  finance,
  research,
  portfolio,
  referral,
  reputation,
  simulation
];

export const getDomain = (slug: string) => domainRegistry.find((domain) => domain.slug === slug);

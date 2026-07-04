import type { CapabilityDefinition } from "@career-os/shared";

export interface ResumeGenerationCapability extends CapabilityDefinition {
  name: "ResumeGenerationCapability";
  requiresHumanReview: true;
  truthfulnessContract: "verified-facts-only";
}

export const resumeGenerationCapability: ResumeGenerationCapability = {
  name: "ResumeGenerationCapability",
  description: "Generates review-required resume drafts by restating resume-allowed profile_facts.current claims only.",
  workers: ["ProfileFactResolver", "ResumeClaimPolicy", "TechnicalResumeWorker", "TruthfulnessGuardWorker"],
  commands: ["resume.generate", "resume.generate_placeholder"],
  events: ["resume.profile_facts_loaded", "resume.claims_filtered", "resume.truthfulness_summary_created", "resume.claim_blocked", "resume.generated", "resume.generation_failed", "resume.placeholder_created"],
  permissions: ["generate_resume"],
  requiresHumanReview: true,
  truthfulnessContract: "verified-facts-only"
};

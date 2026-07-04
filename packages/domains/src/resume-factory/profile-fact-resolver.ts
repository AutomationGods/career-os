import type { StateStore } from "@career-os/state";
import { PROFILE_FACTS_CURRENT_PROJECTION, type ProfileFact } from "../profile-facts/manager";
import { ResumeClaimPolicy, type ResumeClaimDecision } from "./resume-claim-policy";

export interface ResolvedProfileFacts {
  allFacts: ProfileFact[];
  resumeAllowedFacts: ProfileFact[];
  resumeBlockedFacts: ProfileFact[];
  needsEvidenceFacts: ProfileFact[];
  rejectedFacts: ProfileFact[];
  blockedFacts: ProfileFact[];
  userAssertedFacts: ProfileFact[];
  inferredFacts: ProfileFact[];
  verifiedFacts: ProfileFact[];
  decisions: ResumeClaimDecision[];
  sourceProjectionIds: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isProfileFact(value: unknown): value is ProfileFact {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as ProfileFact).id === "string" &&
    typeof (value as ProfileFact).claim === "string" &&
    typeof (value as ProfileFact).truthStatus === "string" &&
    isStringArray((value as ProfileFact).allowedUses) &&
    isStringArray((value as ProfileFact).blockedUses)
  );
}

export class ProfileFactResolver {
  constructor(private readonly stateStore: StateStore, private readonly policy = new ResumeClaimPolicy()) {}

  async resolve(userId?: string): Promise<ResolvedProfileFacts> {
    const projections = await Promise.resolve(this.stateStore.listByProjectionType(PROFILE_FACTS_CURRENT_PROJECTION, userId ? { userId } : undefined));
    const facts = projections.map((projection) => projection.data).filter(isProfileFact);
    const result = this.policy.filter(facts);
    const needsEvidenceFactIds = new Set(result.needsEvidenceDecisions.map((decision) => decision.fact.id));

    return {
      allFacts: facts,
      resumeAllowedFacts: result.allowedDecisions.map((decision) => decision.fact),
      resumeBlockedFacts: result.blockedDecisions.map((decision) => decision.fact),
      needsEvidenceFacts: facts.filter((fact) => fact.truthStatus === "needs_evidence" || needsEvidenceFactIds.has(fact.id)),
      rejectedFacts: facts.filter((fact) => fact.truthStatus === "rejected"),
      blockedFacts: facts.filter((fact) => fact.truthStatus === "blocked"),
      userAssertedFacts: facts.filter((fact) => fact.truthStatus === "user_asserted"),
      inferredFacts: facts.filter((fact) => fact.truthStatus === "inferred"),
      verifiedFacts: facts.filter((fact) => fact.truthStatus === "verified"),
      decisions: result.decisions,
      sourceProjectionIds: projections.map((projection) => projection.id)
    };
  }
}

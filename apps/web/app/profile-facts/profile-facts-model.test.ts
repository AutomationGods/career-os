import { describe, expect, it } from "vitest";
import { countProfileFacts, filterProfileFacts, isShadowedProfileFact, profileFactFromEnvelope, profileFactsFromEnvelope } from "./profile-facts-model";

const facts = [
  {
    id: "fact-1",
    userId: "demo-user",
    factType: "skill",
    label: "Splunk",
    value: "Administered Splunk and Cribl pipelines for production telemetry.",
    sourceType: "manual",
    confidence: 1,
    verificationStatus: "verified",
    allowedInResume: true,
    allowedInCoverLetter: true,
    allowedInRecruiterMessage: true,
    requiresReview: false,
    isBlocked: false
  },
  {
    id: "fact-2",
    userId: "demo-user",
    factType: "certification",
    label: "CISSP",
    sourceType: "manual",
    confidence: 1,
    verificationStatus: "blocked",
    allowedInResume: false,
    allowedInCoverLetter: false,
    allowedInRecruiterMessage: false,
    requiresReview: false,
    isBlocked: true,
    blockedReason: "User does not have this certification."
  },
  {
    id: "fact-3",
    userId: "demo-user",
    factType: "skill",
    label: "CISSP",
    sourceType: "manual",
    confidence: 1,
    verificationStatus: "verified",
    allowedInResume: true,
    allowedInCoverLetter: true,
    allowedInRecruiterMessage: true,
    requiresReview: false,
    isBlocked: false
  }
];

describe("profile facts panel model", () => {
  it("extracts list and single-fact command envelopes", () => {
    expect(profileFactsFromEnvelope({ ok: true, data: { result: { facts } } }).length).toBe(3);
    expect(profileFactFromEnvelope({ ok: true, data: { result: { fact: facts[0] } } })?.label).toBe("Splunk");
  });

  it("counts and filters effective facts after blocked claims shadow same-label facts", () => {
    const summary = countProfileFacts(facts);
    const allVisible = filterProfileFacts(facts, "all");
    const verified = filterProfileFacts(facts, "verified");
    const resumeAllowed = filterProfileFacts(facts, "resume_allowed");
    const blockedClaims = new Set(["cissp"]);

    expect(summary.verifiedFacts).toBe(1);
    expect(summary.blockedClaims).toBe(1);
    expect(summary.resumeAllowedFacts).toBe(1);
    expect(isShadowedProfileFact(facts[2], blockedClaims)).toBe(true);
    expect(allVisible.length).toBe(2);
    expect(verified.length).toBe(1);
    expect(resumeAllowed.length).toBe(1);
    expect(resumeAllowed[0]?.label).toBe("Splunk");
  });
});

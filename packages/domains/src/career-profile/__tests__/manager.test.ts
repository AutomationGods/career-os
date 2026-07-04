import { describe, expect, it } from "vitest";
import type { ProfileFact } from "../../profile-facts/manager";
import { CareerProfileGenerationWorker } from "../manager";

function fact(input: Partial<ProfileFact> & Pick<ProfileFact, "id" | "category" | "claim">): ProfileFact {
  return {
    workspaceId: "default",
    userId: "cert-user",
    normalizedClaim: input.claim.toLowerCase(),
    truthStatus: "user_asserted",
    sourceType: "resume_upload",
    confidence: 0.8,
    allowedUses: ["career_strategy"],
    blockedUses: [],
    createdAt: "2026-07-02T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    ...input
  };
}

describe("CareerProfileGenerationWorker", () => {
  it("keeps usable certifications out of claims to avoid while preserving search keywords", () => {
    const profile = new CareerProfileGenerationWorker().generate({
      userId: "cert-user",
      workspaceId: "default",
      facts: [
        fact({
          id: "cert-admin",
          category: "certification",
          claim: "Splunk Enterprise Certified Administrator",
          allowedUses: []
        }),
        fact({
          id: "cert-architect",
          category: "certification",
          claim: "Splunk Enterprise Certified Architect",
          allowedUses: []
        }),
        fact({
          id: "blocked-claim",
          category: "achievement",
          claim: "Inflated unsupported achievement",
          truthStatus: "blocked",
          allowedUses: []
        })
      ]
    });

    expect(profile.claimsToAvoid.join("|")).toBe("Inflated unsupported achievement");
    expect(profile.searchDiagnostics.certificationsUsedAsSearchKeywords.join("|")).toBe("Splunk Enterprise Certified Administrator|Splunk Enterprise Certified Architect");
    expect(profile.suggestedJobSearchKeywords.slice(0, 2).join("|")).toBe("Splunk Enterprise Certified Administrator|Splunk Enterprise Certified Architect");
  });
});

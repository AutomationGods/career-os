import type { ProfileFact } from "@career-os/domains";
import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { ResumeFactoryManager } from "../manager";
import { ProfileFactResolver } from "../profile-fact-resolver";
import { ResumeClaimPolicy } from "../resume-claim-policy";

function command(payload: Record<string, unknown>, type = "resume.generate") {
  return {
    id: `command-${type}-1`,
    type,
    requestedBy: "api" as const,
    userId: "user-1",
    entityType: "application_packet",
    entityId: String(payload.applicationPacketId ?? "packet-1"),
    payload,
    createdAt: new Date().toISOString()
  };
}

function createContext() {
  return {
    eventStore: new InMemoryEventStore(),
    stateStore: new InMemoryStateStore(),
    snapshotStore: new InMemorySnapshotStore()
  };
}

function fact(overrides: Partial<ProfileFact> & Pick<ProfileFact, "id" | "claim" | "category" | "truthStatus">): ProfileFact {
  return {
    workspaceId: "default",
    userId: "user-1",
    normalizedClaim: overrides.claim.toLowerCase(),
    sourceType: "manual_review",
    confidence: overrides.truthStatus === "verified" ? 1 : 0.7,
    allowedUses: ["resume", "cover_letter", "application_packet"],
    blockedUses: [],
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides
  };
}

function putFacts(context: ReturnType<typeof createContext>, facts: ProfileFact[]) {
  for (const item of facts) {
    context.stateStore.upsertProjection({
      userId: item.userId,
      projectionType: "profile_facts.current",
      entityType: "profile_fact",
      entityId: item.id,
      data: item,
      updatedAt: new Date(item.updatedAt)
    });
  }
}

const basePayload = {
  jobId: "job-1",
  companyId: "company-1",
  applicationPacketId: "packet-1",
  targetRole: "Splunk Terraform Engineer",
  verifiedFacts: ["This payload fact must be ignored."]
};

describe("ResumeClaimPolicy", () => {
  it("allows verified and user_asserted resume facts while excluding unsafe truth statuses", () => {
    const policy = new ResumeClaimPolicy();
    const verified = policy.evaluate(fact({ id: "fact-verified", category: "skill", claim: "Administered Splunk in production.", truthStatus: "verified" }));
    const asserted = policy.evaluate(fact({ id: "fact-asserted", category: "skill", claim: "Built Terraform modules.", truthStatus: "user_asserted", sourceType: "user_input" }));
    const inferred = policy.evaluate(fact({ id: "fact-inferred", category: "domain_experience", claim: "Likely has fintech experience.", truthStatus: "inferred" }));

    expect(verified.allowed).toBe(true);
    expect(asserted.allowed).toBe(true);
    expect(asserted.carefulPhrasingRequired).toBe(true);
    expect(inferred.allowed).toBe(false);
    expect(inferred.reasons.includes("inferred_requires_confirmation")).toBe(true);
  });

  it("excludes unsupported certifications, degrees, clearance claims, employment dates, and job titles", () => {
    const policy = new ResumeClaimPolicy();
    const certification = policy.evaluate(fact({ id: "fact-cert", category: "certification", claim: "CISSP", truthStatus: "user_asserted", sourceType: "user_input" }));
    const degree = policy.evaluate(fact({ id: "fact-degree", category: "education", claim: "BS Computer Science", truthStatus: "verified", sourceType: "user_input" }));
    const dates = policy.evaluate(fact({ id: "fact-dates", category: "work_history", claim: "Worked as Senior Engineer at ExampleCo from 2020 to 2024", truthStatus: "verified", sourceType: "user_input" }));
    const clearance = policy.evaluate(fact({ id: "fact-clearance", category: "clearance", claim: "Active Secret clearance", truthStatus: "user_asserted", sourceType: "user_input" }));

    expect(certification.allowed).toBe(false);
    expect(degree.allowed).toBe(false);
    expect(dates.allowed).toBe(false);
    expect(clearance.allowed).toBe(false);
  });

  it("never upgrades Public Trust into security clearance", () => {
    const policy = new ResumeClaimPolicy();
    const publicTrust = policy.evaluate(fact({ id: "fact-public-trust", category: "clearance", claim: "Public Trust", truthStatus: "verified", evidenceSummary: "Reviewed suitability paperwork." }));
    const upgraded = policy.evaluate(fact({ id: "fact-public-trust-upgrade", category: "clearance", claim: "Public Trust security clearance", truthStatus: "verified", evidenceSummary: "Reviewed suitability paperwork." }));

    expect(publicTrust.allowed).toBe(true);
    expect(publicTrust.resumeClaim).toBe("Public Trust suitability (not a security clearance).");
    expect(upgraded.allowed).toBe(false);
    expect(upgraded.reasons.includes("public_trust_not_security_clearance")).toBe(true);
  });
});

describe("ProfileFactResolver", () => {
  it("loads profile_facts.current and returns resume fact buckets", async () => {
    const context = createContext();
    putFacts(context, [
      fact({ id: "fact-verified", category: "skill", claim: "Administered Splunk in production.", truthStatus: "verified" }),
      fact({ id: "fact-asserted", category: "skill", claim: "Built Terraform modules.", truthStatus: "user_asserted", sourceType: "user_input" }),
      fact({ id: "fact-needs-evidence", category: "certification", claim: "CISSP", truthStatus: "needs_evidence", blockedUses: ["resume"] }),
      fact({ id: "fact-rejected", category: "education", claim: "PhD", truthStatus: "rejected", allowedUses: [], blockedUses: ["resume"] }),
      fact({ id: "fact-blocked", category: "clearance", claim: "Top Secret", truthStatus: "blocked", allowedUses: [], blockedUses: ["resume"] }),
      fact({ id: "fact-inferred", category: "domain_experience", claim: "Likely has fintech experience.", truthStatus: "inferred" })
    ]);

    const resolved = await new ProfileFactResolver(context.stateStore).resolve("user-1");

    expect(JSON.stringify(resolved.resumeAllowedFacts.map((item) => item.id))).toBe(JSON.stringify(["fact-verified", "fact-asserted"]));
    expect(resolved.needsEvidenceFacts.map((item) => item.id).includes("fact-needs-evidence")).toBe(true);
    expect(JSON.stringify(resolved.rejectedFacts.map((item) => item.id))).toBe(JSON.stringify(["fact-rejected"]));
    expect(JSON.stringify(resolved.blockedFacts.map((item) => item.id))).toBe(JSON.stringify(["fact-blocked"]));
    expect(resolved.userAssertedFacts.map((item) => item.id).includes("fact-asserted")).toBe(true);
    expect(resolved.inferredFacts.map((item) => item.id).includes("fact-inferred")).toBe(true);
    expect(resolved.verifiedFacts.map((item) => item.id).includes("fact-verified")).toBe(true);
  });
});

describe("ResumeFactoryManager", () => {
  it("generates a review-required draft only from resume-allowed profile_facts.current facts", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();
    putFacts(context, [
      fact({ id: "fact-splunk", category: "skill", claim: "Administered Splunk and Cribl pipelines for production telemetry.", truthStatus: "verified" }),
      fact({ id: "fact-terraform", category: "skill", claim: "Built Terraform modules for AWS observability workloads.", truthStatus: "user_asserted", sourceType: "user_input" }),
      fact({ id: "fact-inferred", category: "domain_experience", claim: "Likely Kubernetes expert.", truthStatus: "inferred" })
    ]);

    const result = await manager.handle(command(basePayload), context);

    expect(result.ok).toBe(true);
    expect(result.data?.generatedFromProfileFacts).toBe(true);
    expect(JSON.stringify(result.data?.usedFactIds)).toBe(JSON.stringify(["fact-splunk", "fact-terraform"]));
    expect(JSON.stringify(result.data?.blockedFactIds)).toBe(JSON.stringify(["fact-inferred"]));
    expect(JSON.stringify(result.data?.draft.sourceFacts)).toBe(JSON.stringify(["Administered Splunk and Cribl pipelines for production telemetry.", "Built Terraform modules for AWS observability workloads."]));
    expect(result.data?.draft.content.includes("This payload fact must be ignored.")).toBe(false);
    expect(result.data?.draft.content.includes("Likely Kubernetes expert.")).toBe(false);
    expect(result.data?.guard.ok).toBe(true);
  });

  it("emits profile-fact filtering events, resume.generated, and updates resume.current_draft with truth metadata", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();
    putFacts(context, [
      fact({ id: "fact-used", category: "achievement", claim: "Led incident reviews with engineering teams.", truthStatus: "verified" }),
      fact({ id: "fact-blocked", category: "certification", claim: "CISSP", truthStatus: "needs_evidence", blockedUses: ["resume"] })
    ]);

    const result = await manager.handle(command(basePayload), context);
    const projection = context.stateStore.getProjection("application_packet", "packet-1", "resume.current_draft", { userId: "user-1" });
    const emittedTypes = context.eventStore.listRecent(50).map((event) => event.eventType);
    const projectionData = projection?.data as { usedFactIds: string[]; blockedFactIds: string[]; needsEvidenceFactIds: string[]; generatedFromProfileFacts: boolean; truthfulnessSummary: { usedFactCount: number; blockedClaimCount: number; needsEvidenceExclusionCount: number } };

    expect(result.ok).toBe(true);
    expect(emittedTypes.includes("resume.profile_facts_loaded")).toBe(true);
    expect(emittedTypes.includes("resume.claims_filtered")).toBe(true);
    expect(emittedTypes.includes("resume.claim_blocked")).toBe(true);
    expect(emittedTypes.includes("resume.truthfulness_summary_created")).toBe(true);
    expect(emittedTypes.includes("resume.generated")).toBe(true);
    expect(projectionData.generatedFromProfileFacts).toBe(true);
    expect(JSON.stringify(projectionData.usedFactIds)).toBe(JSON.stringify(["fact-used"]));
    expect(JSON.stringify(projectionData.blockedFactIds)).toBe(JSON.stringify(["fact-blocked"]));
    expect(JSON.stringify(projectionData.needsEvidenceFactIds)).toBe(JSON.stringify(["fact-blocked"]));
    expect(projectionData.truthfulnessSummary.usedFactCount).toBe(1);
    expect(projectionData.truthfulnessSummary.blockedClaimCount).toBe(1);
    expect(projectionData.truthfulnessSummary.needsEvidenceExclusionCount).toBe(1);
    expect(context.snapshotStore.listBySnapshotType("resume.source_input").length).toBe(1);
  });

  it("creates a truthful placeholder scaffold when profile_facts.current is empty", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();

    const result = await manager.handle(command({ ...basePayload, verifiedFacts: [] }), context);

    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.data?.usedFactIds)).toBe(JSON.stringify([]));
    expect(JSON.stringify(result.data?.draft.sourceFacts)).toBe(JSON.stringify([]));
    expect(result.data?.draft.content.includes("[Add verified employer]")).toBe(true);
    expect(result.data?.draft.content.includes("[Add measurable achievement]")).toBe(true);
    expect(result.data?.draft.content.includes("[Add certification only if verified]")).toBe(true);
    expect(result.data?.draft.content.includes("[Add clearance/public trust only if verified]")).toBe(true);
    expect(result.data?.draft.content.includes("ExampleCo")).toBe(false);
    expect(result.data?.truthfulnessSummary.missingRequiredFacts.includes("verified employer")).toBe(true);
  });

  it("resume.generate_placeholder uses allowed facts and placeholders instead of invented facts", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();
    putFacts(context, [fact({ id: "fact-used", category: "skill", claim: "Managed Terraform modules for cloud observability infrastructure.", truthStatus: "verified" })]);

    const result = await manager.handle(command(basePayload, "resume.generate_placeholder"), context);
    const emittedTypes = context.eventStore.listRecent(50).map((event) => event.eventType);

    expect(result.ok).toBe(true);
    expect(emittedTypes.includes("resume.placeholder_created")).toBe(true);
    expect(result.data?.draft.content.includes("Managed Terraform modules for cloud observability infrastructure.")).toBe(true);
    expect(result.data?.draft.content.includes("[Add verified employer]")).toBe(true);
    expect(result.data?.draft.content.includes("[Add certification only if verified]")).toBe(true);
    expect(result.data?.draft.content.includes("CISSP")).toBe(false);
    expect(result.data?.draft.content.includes("Secret clearance")).toBe(false);
  });

  it("does not emit forbidden external-action events", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();
    putFacts(context, [fact({ id: "fact-used", category: "skill", claim: "Administered Splunk in production.", truthStatus: "verified" })]);

    await manager.handle(command(basePayload), context);

    const emittedTypes = context.eventStore.listRecent(50).map((event) => event.eventType);

    expect(emittedTypes.includes("email.sent")).toBe(false);
    expect(emittedTypes.includes("application.submitted")).toBe(false);
    expect(emittedTypes.includes("file.uploaded")).toBe(false);
    expect(emittedTypes.includes("browser.used")).toBe(false);
    expect(emittedTypes.includes("linkedin.scraped")).toBe(false);
  });
});

import { domainRegistry, runtimeDescriptors, type CareerOpportunitiesPipeline, type CareerProfile, type ProfileFact, type SourceDocumentsProjection } from "@career-os/domains";
import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { InMemoryApprovalRequestService } from "../approvals";
import { createCommand } from "../command-bus";
import { createCommandBus, createOrchestrator } from "../orchestrator";
import { PermissionPolicyService } from "../permissions";
import { buildRuntimeAuditReport } from "../runtime-audit";

function createTestPlatform() {
  const eventStore = new InMemoryEventStore();
  const stateStore = new InMemoryStateStore();
  const snapshotStore = new InMemorySnapshotStore();
  const approvals = new InMemoryApprovalRequestService(eventStore);
  const orchestrator = createOrchestrator({ eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService(), approvals });
  const bus = createCommandBus(orchestrator);
  return { eventStore, stateStore, snapshotStore, approvals, orchestrator, bus };
}

const resumeText = `
Alex Candidate
DevOps Engineer
Acme Cloud, DevOps Engineer, Jan 2021 - Present
Built Terraform modules on AWS and Linux for observability platforms.
Led Splunk and Cribl SIEM automation that reduced incident triage time by 35%.
Public Trust eligible role supporting government SaaS customers.
Certification: CISSP
Prefers remote full-time DevOps, SRE, and platform engineering roles.
`;

function installMockJobFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("remotive.com")) {
      return Response.json({
        jobs: [
          {
            id: 101,
            url: "https://example.test/jobs/101",
            title: "Remote DevOps Engineer",
            company_name: "FastCo",
            job_type: "full_time",
            candidate_required_location: "Worldwide / Remote",
            description: "Build AWS Terraform Linux observability automation with Splunk and Cribl for remote teams."
          }
        ]
      });
    }
    return Response.json([]);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

async function buildProfile(platform: ReturnType<typeof createTestPlatform>) {
  const imported = await platform.bus.execute(createCommand({
    type: "source_documents.import",
    requestedBy: "api",
    userId: "user-1",
    entityType: "source_document",
    entityId: "doc-1",
    payload: { title: "Resume", documentType: "resume", contentText: resumeText }
  }));
  const extracted = await platform.bus.execute(createCommand({ type: "source_documents.extract_claims", requestedBy: "api", userId: "user-1", entityType: "source_document", entityId: "doc-1", payload: { sourceDocumentId: "doc-1" } }));
  const createdFacts = await platform.bus.execute(createCommand({ type: "profile_facts.create_from_claims", requestedBy: "api", userId: "user-1", entityType: "profile_facts", entityId: "user-1", payload: {} }));
  const profile = await platform.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
  return { imported, extracted, createdFacts, profile };
}

describe("Career Command vertical slice", () => {
  it("imports pasted documents and extracts non-verified career claims through the Command Bus", async () => {
    const platform = createTestPlatform();
    const { imported, extracted } = await buildProfile(platform);
    const sourceProjection = platform.stateStore.getProjection("source_documents", "user-1", "source_documents.current", { userId: "user-1" })?.data as SourceDocumentsProjection;

    expect(platform.orchestrator.listCommandTypes().includes("source_documents.import")).toBe(true);
    expect(platform.orchestrator.listCommandTypes().includes("source_documents.extract_claims")).toBe(true);
    expect(imported.ok).toBe(true);
    expect(extracted.ok).toBe(true);
    expect(sourceProjection.documents.length).toBe(1);
    expect(sourceProjection.claims.length > 4).toBe(true);
    expect(sourceProjection.claims.some((claim) => claim.suggestedTruthStatus === "verified")).toBe(false);
  });

  it("creates Profile Facts from claims using truth rules", async () => {
    const platform = createTestPlatform();
    const { createdFacts } = await buildProfile(platform);
    const facts = platform.stateStore.listByProjectionType("profile_facts.current", { userId: "user-1" }).map((projection) => projection.data as ProfileFact);
    const publicTrust = facts.find((fact) => fact.claim.includes("Public Trust"));
    const certification = facts.find((fact) => fact.category === "certification");

    expect(platform.orchestrator.listCommandTypes().includes("profile_facts.create_from_claims")).toBe(true);
    expect(createdFacts.ok).toBe(true);
    expect(facts.some((fact) => fact.truthStatus === "verified")).toBe(false);
    expect(publicTrust?.normalizedClaim).toBe("public trust");
    expect(publicTrust?.normalizedClaim === "security clearance").toBe(false);
    expect(certification?.truthStatus).toBe("needs_evidence");
    expect(certification?.allowedUses.includes("resume")).toBe(false);
  });

  it("generates Career Profile from Profile Facts and excludes blocked facts from resume-safe facts", async () => {
    const platform = createTestPlatform();
    await buildProfile(platform);
    await platform.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", entityId: "blocked-1", payload: { category: "skill", claim: "Invented COBOL leadership", truthStatus: "blocked" } }));
    const regenerated = await platform.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
    const profile = platform.stateStore.getProjection("career_profile", "user-1", "career_profile.current", { userId: "user-1" })?.data as CareerProfile;

    expect(regenerated.ok).toBe(true);
    expect(profile.generatedFromProjection).toBe("profile_facts.current");
    expect(profile.targetTitles.length > 0).toBe(true);
    expect(profile.suggestedJobSearchKeywords.some((keyword) => keyword.toLowerCase().includes("splunk") || keyword.toLowerCase().includes("siem"))).toBe(true);
    expect(profile.resumeSafeFacts.some((fact) => fact.claim === "Invented COBOL leadership")).toBe(false);
    expect(profile.claimsToAvoid.includes("Invented COBOL leadership")).toBe(true);
  });

  it("finds and ranks jobs from Career Profile keywords without inventing job facts", async () => {
    const restoreFetch = installMockJobFetch();
    try {
      const platform = createTestPlatform();
      await buildProfile(platform);
      const found = await platform.bus.execute(createCommand({ type: "career_opportunities.find_jobs", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { source: "remotive", limit: 5 } }));
      const ranked = await platform.bus.execute(createCommand({ type: "career_opportunities.rank", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: {} }));
      const pipeline = platform.stateStore.getProjection("career_opportunities", "user-1", "career_opportunities.current_pipeline", { userId: "user-1" })?.data as CareerOpportunitiesPipeline;
      const opportunity = pipeline.opportunities[0];

      expect(found.ok).toBe(true);
      expect(ranked.ok).toBe(true);
      expect(pipeline.sourceQuery.toLowerCase().includes("splunk") || pipeline.sourceQuery.toLowerCase().includes("siem")).toBe(true);
      expect(opportunity.salaryText).toBe("unknown");
      expect(opportunity.clearanceRequirements).toBe("unknown");
      expect(opportunity.matchedSkills.length > 0).toBe(true);
      expect(Array.isArray(opportunity.missingSkills)).toBe(true);
    } finally {
      restoreFetch();
    }
  });

  it("creates an Application Packet and grounded resume draft from ranked jobs", async () => {
    const restoreFetch = installMockJobFetch();
    try {
      const platform = createTestPlatform();
      await buildProfile(platform);
      await platform.bus.execute(createCommand({ type: "career_opportunities.find_jobs", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { source: "remotive", limit: 5 } }));
      await platform.bus.execute(createCommand({ type: "career_opportunities.rank", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: {} }));
      const packetResult = await platform.bus.execute(createCommand({ type: "career_opportunities.create_packet", requestedBy: "api", userId: "user-1", entityType: "career_opportunity", entityId: "remotive:101", payload: { opportunityId: "remotive:101" } }));
      const packetProjection = platform.stateStore.listByProjectionType("application_packet.current", { userId: "user-1" })[0];
      const resumeProjection = platform.stateStore.listByProjectionType("resume.current_draft", { userId: "user-1" })[0];
      const packet = packetProjection.data as Record<string, unknown>;
      const truthfulnessSummary = packet.truthfulnessSummary as Record<string, unknown>;

      expect(packetResult.ok).toBe(true);
      expect(Boolean(packetProjection)).toBe(true);
      expect(Boolean(resumeProjection)).toBe(true);
      expect(truthfulnessSummary.generatedFromProfileFacts).toBe(true);
      expect(Number(truthfulnessSummary.needsEvidenceExclusionCount) > 0).toBe(true);
      expect(String(JSON.stringify(packet.resumeDraft)).includes("CISSP")).toBe(false);
    } finally {
      restoreFetch();
    }
  });

  it("generates a Daily Career Mission without auto-apply or email sending", async () => {
    const restoreFetch = installMockJobFetch();
    try {
      const platform = createTestPlatform();
      await buildProfile(platform);
      await platform.bus.execute(createCommand({ type: "career_opportunities.find_jobs", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { source: "remotive", limit: 5 } }));
      await platform.bus.execute(createCommand({ type: "career_opportunities.rank", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: {} }));
      const missionResult = await platform.bus.execute(createCommand({ type: "daily_mission.generate", requestedBy: "api", userId: "user-1", entityType: "daily_mission", entityId: "today", payload: {} }));
      const mission = platform.stateStore.getProjection("daily_mission", "today", "daily_mission.current_queue", { userId: "user-1" })?.data as Record<string, unknown>;

      expect(missionResult.ok).toBe(true);
      expect((mission.topJobsToApplyToday as unknown[]).length > 0).toBe(true);
      expect((mission.missingEvidenceToGather as unknown[]).length > 0).toBe(true);
      expect(JSON.stringify(mission).toLowerCase().includes("auto-apply now")).toBe(false);
      expect(JSON.stringify(mission).toLowerCase().includes("send email now")).toBe(false);
      expect(String(mission.highestLeverageNextAction).toLowerCase().includes("manually")).toBe(true);
    } finally {
      restoreFetch();
    }
  });

  it("keeps Runtime Audit descriptors honest and external actions gated", () => {
    const platform = createTestPlatform();
    const report = buildRuntimeAuditReport({
      domains: domainRegistry,
      descriptors: runtimeDescriptors,
      runtimeWiredCommands: platform.orchestrator.listCommandTypes(),
      runtimeWiredManagers: platform.orchestrator.listRuntimeManagers(),
      observedStateProjections: ["source_documents.current", "career_claim.current", "profile_facts.current", "career_profile.current", "career_opportunities.current_pipeline", "application_packet.current", "resume.current_draft", "daily_mission.current_queue"],
      testFilePaths: ["/repo/packages/orchestration/src/__tests__/career-command-vertical.test.ts", "/repo/packages/orchestration/src/__tests__/profile-facts.test.ts"]
    });
    const sourceDocuments = report.manifests.find((manifest) => manifest.domainId === "source-documents");
    const careerProfile = report.manifests.find((manifest) => manifest.domainId === "career-profile");
    const opportunities = report.manifests.find((manifest) => manifest.domainId === "career-opportunities");
    const communications = report.manifests.find((manifest) => manifest.domainId === "communications");
    const browser = report.manifests.find((manifest) => manifest.domainId === "browser-copilot");

    expect(sourceDocuments?.runtimeWired).toBe(true);
    expect(careerProfile?.runtimeWired).toBe(true);
    expect(opportunities?.runtimeWired).toBe(true);
    expect(sourceDocuments?.status === "production_ready").toBe(false);
    expect(careerProfile?.status === "production_ready").toBe(false);
    expect(opportunities?.status === "production_ready").toBe(false);
    expect(communications?.gated).toBe(true);
    expect(browser?.status === "placeholder" || browser?.gated || browser?.disabled).toBe(true);
  });
});

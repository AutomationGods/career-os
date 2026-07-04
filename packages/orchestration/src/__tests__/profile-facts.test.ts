import { domainRegistry, runtimeDescriptors, type ProfileFact, type ProfileFactUpsertResult } from "@career-os/domains";
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

function factFrom(result: { data?: unknown }) {
  return (result.data as ProfileFactUpsertResult).fact;
}

describe("Profile Facts Domain", () => {
  it("routes profile_facts.upsert through the Command Bus", async () => {
    const { bus, orchestrator } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      entityType: "profile_fact",
      payload: { category: "skill", claim: "Built Terraform modules", truthStatus: "user_asserted" }
    }));

    expect(orchestrator.listCommandTypes().includes("profile_facts.upsert")).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
  });

  it("writes profile_facts.current for a verified fact", async () => {
    const { bus, stateStore } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      entityType: "profile_fact",
      entityId: "fact-verified-1",
      payload: { category: "skill", claim: "Administered Splunk in production", truthStatus: "verified", sourceType: "manual_review", evidenceSummary: "Reviewed against source resume." }
    }));
    const projection = stateStore.getProjection("profile_fact", "fact-verified-1", "profile_facts.current", { userId: "user-1" });

    expect(result.ok).toBe(true);
    expect(Boolean(projection)).toBe(true);
    expect((projection?.data as ProfileFact).truthStatus).toBe("verified");
  });

  it("allows user_asserted facts with careful usage", async () => {
    const { bus } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      payload: { category: "skill", claim: "I have built observability dashboards", truthStatus: "user_asserted", allowedUses: ["resume", "interview_prep"] }
    }));
    const data = result.data as ProfileFactUpsertResult;

    expect(result.ok).toBe(true);
    expect(data.fact.allowedUses.includes("resume")).toBe(true);
    expect(data.carefulPhrasingRequired).toBe(true);
  });

  it("blocks inferred facts from formal resume use without confirmation", async () => {
    const { bus } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      payload: { category: "domain_experience", claim: "Likely has fintech experience", truthStatus: "inferred", sourceType: "system_inference" }
    }));
    const fact = factFrom(result);

    expect(fact.truthStatus).toBe("inferred");
    expect(fact.allowedUses.includes("resume")).toBe(false);
    expect(fact.blockedUses.includes("resume")).toBe(true);
  });

  it("blocks needs_evidence facts from resume and application usage", async () => {
    const { bus } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      payload: { category: "achievement", claim: "Reduced cloud spend by 30%", truthStatus: "needs_evidence" }
    }));
    const fact = factFrom(result);

    expect(fact.truthStatus).toBe("needs_evidence");
    expect(fact.blockedUses.includes("resume")).toBe(true);
    expect(fact.blockedUses.includes("application_packet")).toBe(true);
  });

  it("prevents rejected facts from being used", async () => {
    const { bus } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      payload: { category: "education", claim: "PhD in Computer Science", truthStatus: "rejected" }
    }));
    const fact = factFrom(result);

    expect(fact.truthStatus).toBe("rejected");
    expect(fact.allowedUses.length).toBe(0);
    expect(fact.blockedUses.includes("resume")).toBe(true);
    expect(fact.blockedUses.includes("career_strategy")).toBe(true);
  });

  it("prevents blocked facts from being used anywhere", async () => {
    const { bus } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      payload: { category: "certification", claim: "CISSP", truthStatus: "blocked" }
    }));
    const fact = factFrom(result);

    expect(fact.truthStatus).toBe("blocked");
    expect(fact.allowedUses.length).toBe(0);
    expect(fact.blockedUses.length).toBe(6);
  });

  it("does not upgrade Public Trust into security clearance", async () => {
    const { bus } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      payload: { category: "clearance", claim: "Public Trust clearance", truthStatus: "user_asserted" }
    }));
    const fact = factFrom(result);

    expect(fact.normalizedClaim).toBe("public trust");
    expect(fact.normalizedClaim === "security clearance").toBe(false);
    expect(fact.truthStatus === "verified").toBe(false);
  });

  it("requires evidence for certification claims", async () => {
    const { bus } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      payload: { category: "certification", claim: "CISSP", truthStatus: "verified", sourceType: "system_inference" }
    }));
    const fact = factFrom(result);

    expect(fact.truthStatus).toBe("needs_evidence");
    expect(fact.allowedUses.includes("resume")).toBe(false);
  });

  it("emits failure event and Runtime Audit recognizes failurePathExists", async () => {
    const { bus, eventStore, orchestrator } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "profile_facts.upsert",
      requestedBy: "api",
      userId: "user-1",
      entityType: "profile_fact",
      entityId: "fact-failure-1",
      payload: { category: "skill", claim: "" }
    }));
    const emittedTypes = eventStore.listByEntity("profile_fact", "fact-failure-1").map((event) => event.eventType);
    const report = buildRuntimeAuditReport({ domains: domainRegistry, descriptors: runtimeDescriptors, runtimeWiredCommands: orchestrator.listCommandTypes(), runtimeWiredManagers: orchestrator.listRuntimeManagers(), testFilePaths: ["/repo/packages/orchestration/src/__tests__/profile-facts.test.ts"] });
    const manifest = report.manifests.find((item) => item.domainId === "profile-facts");

    expect(result.ok).toBe(false);
    expect(emittedTypes.includes("profile_fact.upsert_failed")).toBe(true);
    expect(manifest?.failurePathExists).toBe(true);
  });

  it("computes Profile Facts descriptor maturity from runtime evidence", () => {
    const { orchestrator } = createTestPlatform();
    const report = buildRuntimeAuditReport({
      domains: domainRegistry,
      descriptors: runtimeDescriptors,
      runtimeWiredCommands: orchestrator.listCommandTypes(),
      runtimeWiredManagers: orchestrator.listRuntimeManagers(),
      observedStateProjections: ["profile_facts.current"],
      testFilePaths: ["/repo/packages/orchestration/src/__tests__/profile-facts.test.ts"]
    });
    const manifest = report.manifests.find((item) => item.domainId === "profile-facts");

    expect(manifest?.descriptorPresent).toBe(true);
    expect(manifest?.status).toBe("production_ready");
    expect(manifest?.active).toBe(true);
  });

  it("keeps placeholder domains placeholder", () => {
    const { orchestrator } = createTestPlatform();
    const report = buildRuntimeAuditReport({ domains: domainRegistry, descriptors: runtimeDescriptors, runtimeWiredCommands: orchestrator.listCommandTypes(), runtimeWiredManagers: orchestrator.listRuntimeManagers() });
    const memory = report.manifests.find((item) => item.domainId === "memory");

    expect(memory?.status).toBe("placeholder");
    expect(memory?.active).toBe(false);
  });
});

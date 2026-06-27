import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { IdentityManager } from "../manager";
import { InMemoryProfileFactsStore, isShadowedByBlockedClaim, selectBlockedClaimLabels, selectResumeAllowedFacts } from "../profile-facts-service";

function createStore() {
  return new InMemoryProfileFactsStore();
}

function command(type: string, payload: Record<string, unknown>) {
  return { id: `command-${type}`, type, requestedBy: "api" as const, entityType: "user", entityId: String(payload.userId ?? payload.id ?? "demo-user"), payload, createdAt: new Date().toISOString() };
}

function context(store = createStore()) {
  return { eventStore: new InMemoryEventStore(), stateStore: new InMemoryStateStore(), snapshotStore: new InMemorySnapshotStore(), profileFactsStore: store };
}

describe("Profile Facts service", () => {
  it("creates, updates, verifies, and archives facts", () => {
    const store = createStore();
    const created = store.create({ userId: "demo-user", factType: "skill", label: "Splunk", sourceType: "manual" });
    const updated = store.update({ id: created.id, allowedInResume: true });
    const verified = store.verify(created.id);
    const archived = store.archive(created.id);

    expect(created.label).toBe("Splunk");
    expect(updated?.allowedInResume).toBe(true);
    expect(verified?.verificationStatus).toBe("verified");
    expect(Boolean(archived?.archivedAt)).toBe(true);
  });

  it("blocks facts and lists blocked claims", () => {
    const store = createStore();
    const blocked = store.block({ userId: "demo-user", label: "CISSP", factType: "certification", blockedReason: "User does not have this certification." });
    const claims = selectBlockedClaimLabels(store.list({ userId: "demo-user", filter: "blocked" }));

    expect(blocked?.isBlocked).toBe(true);
    expect(blocked?.allowedInResume).toBe(false);
    expect(claims.includes("CISSP")).toBe(true);
  });

  it("seeds initial facts idempotently and exposes resume-allowed facts", () => {
    const store = createStore();
    const first = store.seedInitial("demo-user");
    const second = store.seedInitial("demo-user");
    const facts = store.list({ userId: "demo-user", filter: "all" });
    const resumeFacts = selectResumeAllowedFacts(facts);
    const blockedClaims = selectBlockedClaimLabels(facts);

    expect(first.createdCount > 0).toBe(true);
    expect(second.createdCount).toBe(0);
    expect(second.skippedCount).toBe(first.facts.length);
    expect(resumeFacts.includes("Splunk")).toBe(true);
    expect(resumeFacts.includes("CISSP")).toBe(false);
    expect(blockedClaims.includes("Security+")).toBe(true);
    expect(blockedClaims.includes("Top Secret clearance")).toBe(true);
  });

  it("lists facts by status and resume-allowed filter", () => {
    const store = createStore();
    store.create({ userId: "demo-user", factType: "skill", label: "Cribl", verificationStatus: "verified", allowedInResume: true, requiresReview: false });
    store.create({ userId: "demo-user", factType: "skill", label: "Needs review", verificationStatus: "needs_review", requiresReview: true });

    expect(store.list({ userId: "demo-user", filter: "verified" }).length).toBe(1);
    expect(store.list({ userId: "demo-user", filter: "needs_review" }).length).toBe(1);
    expect(store.list({ userId: "demo-user", filter: "resume_allowed" }).length).toBe(1);
  });

  it("keeps blocked claim labels out of default and resume-allowed selected facts", () => {
    const store = createStore();
    store.block({ userId: "demo-user", label: "CISSP", factType: "certification", blockedReason: "User does not have this certification." });
    const shadowed = store.create({ userId: "demo-user", factType: "skill", label: "CISSP", verificationStatus: "verified", allowedInResume: true, requiresReview: false });
    const allFacts = store.list({ userId: "demo-user", filter: "all" });
    const resumeAllowed = store.list({ userId: "demo-user", filter: "resume_allowed" });

    expect(isShadowedByBlockedClaim(shadowed, new Set(["cissp"]))).toBe(true);
    expect(allFacts.some((fact) => fact.id === shadowed.id)).toBe(false);
    expect(resumeAllowed.some((fact) => fact.label === "CISSP")).toBe(false);
    expect(selectResumeAllowedFacts(allFacts).includes("CISSP")).toBe(false);
  });

  it("does not unblock an existing blocked fact through create", () => {
    const store = createStore();
    store.block({ userId: "demo-user", label: "CISSP", factType: "certification", blockedReason: "User does not have this certification." });
    const attempted = store.create({ userId: "demo-user", factType: "certification", label: "CISSP", verificationStatus: "verified", allowedInResume: true, requiresReview: false });

    expect(attempted.isBlocked).toBe(true);
    expect(attempted.allowedInResume).toBe(false);
  });
});

describe("IdentityManager Profile Facts commands", () => {
  it("runs Profile Facts commands through the manager and updates projections", async () => {
    const store = createStore();
    const manager = new IdentityManager();
    const testContext = context(store);
    const result = await manager.handle(command("profile_facts.seed_initial", { userId: "demo-user" }), testContext);
    const projection = testContext.stateStore.getProjection("user", "demo-user", "profile_facts.current");
    const eventTypes = testContext.eventStore.listRecent(20).map((event) => event.eventType);

    expect(result.ok).toBe(true);
    expect(Boolean(projection)).toBe(true);
    expect(eventTypes.includes("profile_facts.seeded")).toBe(true);
  });

  it("creates and blocks facts with emitted events", async () => {
    const store = createStore();
    const manager = new IdentityManager();
    const testContext = context(store);
    const created = await manager.handle(command("profile_facts.create", { userId: "demo-user", factType: "tool", label: "Splunk", verificationStatus: "verified", allowedInResume: true, requiresReview: false }), testContext);
    const blocked = await manager.handle(command("profile_facts.block", { userId: "demo-user", label: "CISSP", blockedReason: "Not certified." }), testContext);
    const eventTypes = testContext.eventStore.listRecent(20).map((event) => event.eventType);

    expect(created.ok).toBe(true);
    expect(blocked.ok).toBe(true);
    expect(eventTypes.includes("profile_fact.created")).toBe(true);
    expect(eventTypes.includes("profile_fact.blocked")).toBe(true);
  });
});

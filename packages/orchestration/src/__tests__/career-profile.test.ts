import { defaultUrgentSearchTitles, type CareerProfile, type ProfileFact } from "@career-os/domains";
import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { InMemoryApprovalRequestService } from "../approvals";
import { createCommand } from "../command-bus";
import { createCommandBus, createOrchestrator } from "../orchestrator";
import { PermissionPolicyService } from "../permissions";

function platform() {
  const eventStore = new InMemoryEventStore();
  const stateStore = new InMemoryStateStore();
  const snapshotStore = new InMemorySnapshotStore();
  const orchestrator = createOrchestrator({ eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService(), approvals: new InMemoryApprovalRequestService(eventStore) });
  return { bus: createCommandBus(orchestrator), stateStore, orchestrator };
}

describe("Career Profile Domain", () => {
  it("generates career_profile.current from usable Profile Facts", async () => {
    const test = platform();
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "skill", claim: "DevOps", truthStatus: "user_asserted", allowedUses: ["resume", "career_strategy", "application_packet"] } }));
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "tool", claim: "AWS", truthStatus: "user_asserted", allowedUses: ["resume", "career_strategy", "application_packet"] } }));
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "skill", claim: "Invented skill", truthStatus: "blocked" } }));

    const result = await test.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
    const profile = test.stateStore.getProjection("career_profile", "user-1", "career_profile.current", { userId: "user-1" })?.data as CareerProfile;

    expect(test.orchestrator.listCommandTypes().includes("career_profile.generate")).toBe(true);
    expect(result.ok).toBe(true);
    expect(profile.generatedFromProjection).toBe("profile_facts.current");
    expect(profile.suggestedJobSearchKeywords.includes("Splunk Architect") || profile.suggestedJobSearchKeywords.includes("SIEM Engineer")).toBe(true);
    expect(profile.resumeSafeFacts.some((fact: ProfileFact) => fact.claim === "Invented skill")).toBe(false);
  });

  it("excludes companies, certifications, dates, and employer history lines from target titles/search keywords", async () => {
    const test = platform();
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "work_history", claim: "Employer: Shorepoint Inc | Cybersecurity Engineer / Splunk Architect", truthStatus: "user_asserted" } }));
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "work_history", claim: "Employer: Dell Cyber LLC | Cybersecurity Engineer / Splunk Consultant / Architect", truthStatus: "user_asserted" } }));
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "certification", claim: "Splunk Enterprise Certified Architect", truthStatus: "needs_evidence" } }));
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "certification", claim: "Splunk Enterprise Certified Administrator", truthStatus: "needs_evidence" } }));
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "work_history", claim: "Work date: Jan 2020 - Present", truthStatus: "needs_evidence" } }));

    await test.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
    const profile = test.stateStore.getProjection("career_profile", "user-1", "career_profile.current", { userId: "user-1" })?.data as CareerProfile;
    const allSearchText = [...profile.targetTitles, ...profile.suggestedJobSearchKeywords].join(" | ");

    expect(profile.targetTitles.includes("Splunk Architect")).toBe(true);
    expect(profile.targetTitles.includes("Splunk Administrator")).toBe(true);
    expect(profile.targetTitles.includes("SIEM Engineer")).toBe(true);
    expect(profile.targetTitles.includes("Cribl Engineer")).toBe(true);
    expect(profile.targetTitles.includes("Splunk Enterprise Certified Architect")).toBe(false);
    expect(profile.targetTitles.includes("Splunk Enterprise Certified Administrator")).toBe(false);
    expect(allSearchText.includes("Shorepoint")).toBe(false);
    expect(allSearchText.includes("Dell Cyber")).toBe(false);
    expect(allSearchText.includes("Jan 2020")).toBe(false);
    expect(defaultUrgentSearchTitles.every((title) => profile.targetTitles.includes(title))).toBe(true);
  });

  it("derives strongest domains as clean comma-friendly categories, not employer history lines", async () => {
    const test = platform();
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "domain_experience", claim: "Shorepoint Inc | Cybersecurity Engineer / Splunk Architect", truthStatus: "user_asserted" } }));
    await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "achievement", claim: "Maintained Splunk Enterprise Security, SIEM alert tuning, Cribl pipelines, and cloud security monitoring.", truthStatus: "user_asserted", allowedUses: ["resume", "career_strategy", "application_packet"] } }));

    await test.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
    const profile = test.stateStore.getProjection("career_profile", "user-1", "career_profile.current", { userId: "user-1" })?.data as CareerProfile;

    expect(profile.strongestDomains).toEqual(expect.arrayContaining(["SIEM", "Splunk", "Cribl", "Cloud Security"]));
    expect(profile.strongestDomains.some((domain) => domain.includes("Shorepoint") || domain.includes("|") || domain.startsWith("*"))).toBe(false);
  });

  it("keeps resume-backed dates and education out of missing evidence and keeps certifications out of title search", async () => {
    const test = platform();
    await test.bus.execute(createCommand({
      type: "source_documents.import",
      requestedBy: "api",
      userId: "user-1",
      entityType: "source_document",
      entityId: "resume-1",
      payload: {
        title: "Resume",
        documentType: "resume",
        contentText: [
          "Public Trust",
          "Bachelor of Arts, Health Care Administration | Athens, OH",
          "Shorepoint Inc | Cybersecurity Engineer / Splunk Architect",
          "Jun 2022 – March 2026",
          "* Splunk Enterprise Certified Administrator",
          "* Splunk Enterprise Certified Architect",
          "* Administered government-compliant TLS certificate lifecycle across all Splunk endpoints",
          "* Reduced false positive alerts by 85% through custom correlation rule optimization and advanced detection algorithms"
        ].join("\n")
      }
    }));
    await test.bus.execute(createCommand({ type: "source_documents.extract_claims", requestedBy: "api", userId: "user-1", entityType: "source_documents", entityId: "user-1", payload: {} }));
    await test.bus.execute(createCommand({ type: "profile_facts.create_from_claims", requestedBy: "api", userId: "user-1", entityType: "profile_facts", entityId: "user-1", payload: {} }));
    await test.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
    const profile = test.stateStore.getProjection("career_profile", "user-1", "career_profile.current", { userId: "user-1" })?.data as CareerProfile;

    expect(profile.missingEvidence).toEqual(["Public Trust"]);
    expect(profile.searchDiagnostics.certificationsKeptOutOfTitleSearch).toEqual(expect.arrayContaining(["Splunk Enterprise Certified Administrator", "Splunk Enterprise Certified Architect"]));
    expect(profile.searchDiagnostics.certificationsKeptOutOfTitleSearch).toHaveLength(2);
    expect(profile.searchDiagnostics.certificationsKeptOutOfTitleSearch.some((item) => item.includes("Job title") || item.includes("TLS certificate lifecycle"))).toBe(false);
    expect(profile.searchDiagnostics.ignoredResumeLinesForSearch.some((item) => item.includes("Reduced false positive alerts"))).toBe(true);
  });
});

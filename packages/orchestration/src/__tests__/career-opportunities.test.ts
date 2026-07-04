import { evaluateJobFit, type CareerOpportunitiesPipeline } from "@career-os/domains";
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
  return { bus: createCommandBus(orchestrator), stateStore, orchestrator, eventStore };
}

function installJobFetch(jobs = [{ id: 1, url: "https://example.test/job", title: "Remote Splunk Engineer", company_name: "FastCo", candidate_required_location: "Remote", job_type: "full_time", description: "Splunk SIEM AWS Terraform Linux observability role." }]) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ jobs })) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

async function seedProfile(test: ReturnType<typeof platform>) {
  await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "skill", claim: "DevOps", truthStatus: "user_asserted", allowedUses: ["career_strategy", "application_packet", "resume"] } }));
  await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "tool", claim: "AWS", truthStatus: "user_asserted", allowedUses: ["career_strategy", "application_packet", "resume"] } }));
  await test.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
}

describe("Career Opportunities Domain", () => {
  it("finds and ranks jobs from Career Profile without inventing unknown salary", async () => {
    const restoreFetch = installJobFetch();
    try {
      const test = platform();
      await seedProfile(test);
      const found = await test.bus.execute(createCommand({ type: "career_opportunities.find_jobs", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { source: "remotive", limit: 3 } }));
      const ranked = await test.bus.execute(createCommand({ type: "career_opportunities.rank", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: {} }));
      const pipeline = test.stateStore.getProjection("career_opportunities", "user-1", "career_opportunities.current_pipeline", { userId: "user-1" })?.data as CareerOpportunitiesPipeline;

      expect(test.orchestrator.listCommandTypes().includes("career_opportunities.find_jobs")).toBe(true);
      expect(found.ok).toBe(true);
      expect(ranked.ok).toBe(true);
      expect(pipeline.opportunities.length > 0).toBe(true);
      expect(pipeline.opportunities[0].salaryText).toBe("unknown");
      expect(pipeline.opportunities[0].fitGatePassed).toBe(true);
      expect(pipeline.opportunities[0].matchedStrongKeywords.length > 0).toBe(true);
    } finally {
      restoreFetch();
    }
  });

  it("uses clean discovery queries without company names or certification titles", async () => {
    const restoreFetch = installJobFetch();
    try {
      const test = platform();
      await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "work_history", claim: "Employer: Shorepoint Inc | Cybersecurity Engineer / Splunk Architect", truthStatus: "user_asserted" } }));
      await test.bus.execute(createCommand({ type: "profile_facts.upsert", requestedBy: "api", userId: "user-1", entityType: "profile_fact", payload: { category: "certification", claim: "Splunk Enterprise Certified Architect", truthStatus: "needs_evidence" } }));
      await test.bus.execute(createCommand({ type: "career_profile.generate", requestedBy: "api", userId: "user-1", entityType: "career_profile", entityId: "user-1", payload: {} }));
      await test.bus.execute(createCommand({ type: "career_opportunities.find_jobs", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { source: "remotive", limit: 3 } }));
      const pipeline = test.stateStore.getProjection("career_opportunities", "user-1", "career_opportunities.current_pipeline", { userId: "user-1" })?.data as CareerOpportunitiesPipeline;
      const queryText = `${pipeline.sourceQuery} ${pipeline.searchQueriesUsed.join(" ")}`;

      expect(queryText.includes("Shorepoint")).toBe(false);
      expect(queryText.includes("Splunk Enterprise Certified Architect")).toBe(false);
      expect(pipeline.sourceDiagnostics.enabledSources.includes("Remotive public API")).toBe(true);
      expect(pipeline.sourceDiagnostics.enabledSources.includes("Manual Job Import")).toBe(true);
      expect(pipeline.sourceDiagnostics.disabledSources.includes("LinkedIn scraping")).toBe(true);
    } finally {
      restoreFetch();
    }
  });

  it("rejects disqualified and weak-only jobs while passing strong Splunk/SIEM/Cribl/security jobs", () => {
    const badTitles = ["Communications Manager", "Sales Assistant", "Client Success Coach", "Senior Product Manager", "AI Cinematic Video Editor", "Social Media Manager"];
    for (const title of badTitles) {
      const fit = evaluateJobFit({ title, description: "automation AWS Azure Python cloud observability" });
      expect(fit.passed).toBe(false);
      expect(fit.status).toBe("not_fit");
      expect(fit.score).toBe(0);
      expect(fit.risks.includes("role_mismatch")).toBe(true);
      expect(fit.missingRequiredContext.some((item) => item.includes("role_mismatch"))).toBe(true);
    }

    const social = evaluateJobFit({ title: "Social Media Manager", description: "social content campaigns for cloud communities" });
    const weakOnly = evaluateJobFit({ title: "Platform Automation Engineer", description: "automation AWS Azure Python Docker Kubernetes cloud observability" });
    const qualityNoSecurity = evaluateJobFit({ title: "Quality Engineer", description: "automation Python QA testing" });
    const qualityWithSecurity = evaluateJobFit({ title: "Quality Engineer", description: "Splunk SIEM detection engineering log management validation" });
    const strongJobs = [
      evaluateJobFit({ title: "Splunk SIEM Engineer", description: "Splunk Enterprise Security ES CIM SPL log onboarding and Cribl pipelines" }),
      evaluateJobFit({ title: "SIEM Engineer", description: "security monitoring syslog correlation rule log management" }),
      evaluateJobFit({ title: "Cribl Engineer", description: "Cribl Stream log routing pipelines for Splunk" }),
      evaluateJobFit({ title: "Cloud Security Engineer", description: "AWS security GuardDuty IAM security monitoring" })
    ];

    expect(social.passed).toBe(false);
    expect(social.status).toBe("not_fit");
    expect(social.matchedStrongKeywords.includes("soc")).toBe(false);
    expect(weakOnly.passed).toBe(false);
    expect(qualityNoSecurity.passed).toBe(false);
    expect(qualityWithSecurity.passed).toBe(true);
    for (const fit of strongJobs) expect(fit.passed).toBe(true);
    expect(strongJobs[0].matchedStrongKeywords.includes("splunk")).toBe(true);
  });

  it("imports manual jobs through the Command Bus and hard fit gate without inventing unknown facts", async () => {
    const test = platform();
    await seedProfile(test);

    const importedTitles = ["Splunk Architect", "Splunk Administrator", "SIEM Engineer", "Cribl Engineer"];
    for (const title of importedTitles) {
      const result = await test.bus.execute(createCommand({
        type: "career_opportunities.create_from_job_input",
        requestedBy: "api",
        userId: "user-1",
        entityType: "career_opportunities",
        entityId: "user-1",
        payload: { title, company: "ManualCo", source: "Manual Job Import", jobDescription: `${title} role using Splunk SIEM Cribl log management security monitoring.`, location: "Remote" }
      }));
      expect(result.ok).toBe(true);
    }

    const rejected = await test.bus.execute(createCommand({ type: "career_opportunities.create_from_job_input", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { title: "Sales Assistant", company: "BadFitCo", source: "Manual Job Import", jobDescription: "Sales pipeline and customer demos." } }));
    const social = await test.bus.execute(createCommand({ type: "career_opportunities.create_from_job_input", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { title: "Social Media Manager", company: "BadFitCo", source: "Manual Job Import", jobDescription: "Social content campaigns for cloud communities." } }));
    const pipeline = test.stateStore.getProjection("career_opportunities", "user-1", "career_opportunities.current_pipeline", { userId: "user-1" })?.data as CareerOpportunitiesPipeline;
    const imported = pipeline.opportunities.filter((job) => importedTitles.includes(job.title));
    const sales = pipeline.opportunities.find((job) => job.title === "Sales Assistant");
    const socialJob = pipeline.opportunities.find((job) => job.title === "Social Media Manager");
    const splunkArchitect = pipeline.opportunities.find((job) => job.title === "Splunk Architect");

    expect(test.orchestrator.listCommandTypes().includes("career_opportunities.create_from_job_input")).toBe(true);
    expect(rejected.ok).toBe(true);
    expect(social.ok).toBe(true);
    expect(imported.length).toBe(4);
    expect(imported.every((job) => job.fitGatePassed === true)).toBe(true);
    expect(sales?.status).toBe("not_fit");
    expect(socialJob?.status).toBe("not_fit");
    expect(splunkArchitect?.salaryText).toBe("unknown");
    expect(splunkArchitect?.clearanceRequirements).toBe("unknown");
    expect(splunkArchitect?.certificationRequirements).toBe("unknown");
    expect(test.eventStore.listByType("career_opportunity.manual_import_started").length > 0).toBe(true);
    expect(test.eventStore.listByType("career_opportunity.manual_imported").length > 0).toBe(true);
    expect(test.eventStore.listByType("career_opportunity.rejected").length > 0).toBe(true);
  });

  it("supports conservative bulk paste for clearly labeled jobs", async () => {
    const test = platform();
    const result = await test.bus.execute(createCommand({
      type: "career_opportunities.create_from_job_input",
      requestedBy: "api",
      userId: "user-1",
      entityType: "career_opportunities",
      entityId: "user-1",
      payload: { bulkText: "Title: Splunk Architect\nCompany: BulkCo\nDescription: Splunk Enterprise Security SIEM log onboarding.\n\n---\n\nTitle: Social Media Manager\nCompany: BulkBad\nDescription: Social content calendar." }
    }));
    const pipeline = test.stateStore.getProjection("career_opportunities", "user-1", "career_opportunities.current_pipeline", { userId: "user-1" })?.data as CareerOpportunitiesPipeline;

    expect(result.ok).toBe(true);
    expect(pipeline.opportunities.some((job) => job.title === "Splunk Architect" && job.fitGatePassed === true)).toBe(true);
    expect(pipeline.opportunities.some((job) => job.title === "Social Media Manager" && job.status === "not_fit")).toBe(true);
  });

  it("creates packets and grounded resume drafts for passing imported jobs", async () => {
    const test = platform();
    await seedProfile(test);
    await test.bus.execute(createCommand({ type: "career_opportunities.create_from_job_input", requestedBy: "api", userId: "user-1", entityType: "career_opportunities", entityId: "user-1", payload: { title: "Splunk Architect", company: "ManualCo", source: "Manual Job Import", applyUrl: "https://example.test/apply", jobDescription: "Splunk Enterprise Security SIEM architect role with log onboarding and Cribl pipelines." } }));
    const pipeline = test.stateStore.getProjection("career_opportunities", "user-1", "career_opportunities.current_pipeline", { userId: "user-1" })?.data as CareerOpportunitiesPipeline;
    const opportunity = pipeline.opportunities.find((job) => job.title === "Splunk Architect");

    const packetResult = await test.bus.execute(createCommand({ type: "career_opportunities.create_packet", requestedBy: "api", userId: "user-1", entityType: "career_opportunity", entityId: opportunity?.id, payload: { opportunityId: opportunity?.id } }));
    const packetProjection = test.stateStore.listByProjectionType("application_packet.current", { userId: "user-1" })[0];
    const resumeProjection = test.stateStore.listByProjectionType("resume.current_draft", { userId: "user-1" })[0];
    const packet = packetProjection.data as Record<string, unknown>;

    expect(opportunity?.fitGatePassed).toBe(true);
    expect(packetResult.ok).toBe(true);
    expect(Boolean(packetProjection)).toBe(true);
    expect(Boolean(resumeProjection)).toBe(true);
    expect(Boolean(packet.truthfulnessSummary)).toBe(true);
    expect(Array.isArray(packet.blockedClaims)).toBe(true);
    expect(Array.isArray(packet.needsEvidenceFactIds)).toBe(true);
    expect(String(packet.nextAction).toLowerCase().includes("manually")).toBe(true);
  });

  it("rejects packet and resume creation for not-fit opportunities", async () => {
    const test = platform();
    await test.stateStore.upsertProjection({
      userId: "user-1",
      projectionType: "career_opportunities.current_pipeline",
      entityType: "career_opportunities",
      entityId: "user-1",
      data: {
        opportunities: [{
          id: "job-social-media-manager",
          title: "Social Media Manager",
          company: "BadFitCo",
          jobDescription: "social content campaigns for cloud communities",
          status: "not_fit",
          fitGatePassed: false,
          fitScore: 0,
          missionPriority: -100
        }, {
          id: "job-rejected",
          title: "Rejected Splunk Job",
          company: "RejectedCo",
          jobDescription: "Splunk SIEM role but user rejected it",
          status: "rejected",
          fitGatePassed: true,
          fitScore: 80,
          missionPriority: 80
        }, {
          id: "job-splunk-engineer",
          title: "Splunk Engineer",
          company: "GoodFitCo",
          jobDescription: "Splunk SIEM log onboarding role",
          status: "ranked",
          fitGatePassed: true,
          fitScore: 85,
          missionPriority: 85,
          matchedSkills: ["splunk"]
        }]
      }
    });

    const result = await test.bus.execute(createCommand({ type: "career_opportunities.create_packet", requestedBy: "api", userId: "user-1", entityType: "career_opportunity", entityId: "job-social-media-manager", payload: { opportunityId: "job-social-media-manager" } }));
    const rejectedResult = await test.bus.execute(createCommand({ type: "career_opportunities.create_packet", requestedBy: "api", userId: "user-1", entityType: "career_opportunity", entityId: "job-rejected", payload: { opportunityId: "job-rejected" } }));
    const missingResult = await test.bus.execute(createCommand({ type: "career_opportunities.create_packet", requestedBy: "api", userId: "user-1", entityType: "career_opportunity", entityId: "missing-job", payload: { opportunityId: "missing-job" } }));

    expect(result.ok).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.error?.code).toBe("OPPORTUNITY_NOT_FIT");
    expect(rejectedResult.ok).toBe(false);
    expect(rejectedResult.status).toBe("rejected");
    expect(rejectedResult.error?.code).toBe("OPPORTUNITY_NOT_FIT");
    expect(missingResult.ok).toBe(false);
    expect(missingResult.status).toBe("rejected");
    expect(missingResult.error?.code).toBe("OPPORTUNITY_NOT_FOUND");
    expect(test.stateStore.listByProjectionType("application_packet.current", { userId: "user-1" }).length).toBe(0);
    expect(test.stateStore.listByProjectionType("resume.current_draft", { userId: "user-1" }).length).toBe(0);
  });
});

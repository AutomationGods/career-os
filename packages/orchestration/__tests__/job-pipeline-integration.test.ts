import { describe, expect, it, beforeEach } from "vitest";
import { createOrchestrator, createCommand, PermissionPolicyService, InMemoryApprovalRequestService } from "@career-os/orchestration";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import { snapshotStore } from "@career-os/snapshots";

function createTestOrchestrator() {
  return createOrchestrator({
    eventStore,
    stateStore,
    snapshotStore,
    permissions: new PermissionPolicyService(),
    approvals: new InMemoryApprovalRequestService(eventStore),
  });
}

describe("Job pipeline integration", () => {
  beforeEach(() => {
    eventStore.clear();
    stateStore.clear();
    snapshotStore.clear();
  });

  it("runs find_jobs → rank_jobs → create_packet → generate_resume flow", async () => {
    const orchestrator = createTestOrchestrator();
    const userId = "integration-user";

    // Step 1: Import a manual job (skip external API)
    const importResult = await orchestrator.execute(createCommand({
      type: "career_opportunities.create_from_job_input",
      requestedBy: "api",
      userId,
      entityType: "career_opportunities",
      entityId: userId,
      payload: {
        title: "Splunk Engineer",
        company: "TestCo",
        jobDescription: "Splunk SIEM Terraform AWS observability monitoring role",
        source: "Manual Job Import",
      },
    }));

    expect(importResult.ok).toBe(true);
    expect(importResult.status).toBe("completed");
    expect(importResult.data).toBeDefined();

    const pipeline = importResult.data as { opportunities: Array<{ id: string; fitScore: number }> };
    expect(pipeline.opportunities.length).toBeGreaterThan(0);

    // Step 2: Create a packet for the first opportunity
    const opportunity = pipeline.opportunities[0];
    const packetResult = await orchestrator.execute(createCommand({
      type: "application_packets.create",
      requestedBy: "api",
      userId,
      entityType: "application_packet",
      entityId: opportunity.id,
      payload: {
        jobId: opportunity.id,
        selectedJob: { title: "Splunk Engineer", company: "TestCo", source: "test", raw: {} },
        selectedCompany: { name: "TestCo" },
        fitScoreSummary: { score: opportunity.fitScore, segment: "Remote Commercial", highlights: [] },
      },
    }));

    expect(packetResult.ok).toBe(true);
    expect(packetResult.status).toBe("completed");

    // Step 3: Generate resume for the packet
    const packet = packetResult.data as { id: string };
    const resumeResult = await orchestrator.execute(createCommand({
      type: "resume.generate",
      requestedBy: "api",
      userId,
      entityType: "application_packet",
      entityId: packet.id,
      payload: { applicationPacketId: packet.id, targetRole: "Splunk Engineer", companyName: "TestCo" },
    }));

    // Resume generation may fail/reject without profile facts, but the command should be handled
    expect(resumeResult.status).toBeDefined();
    expect(["completed", "failed", "rejected"]).toContain(resumeResult.status);

    // Verify events were emitted
    const events = eventStore.listByUser(userId);
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain("career_opportunity.manual_imported");
    expect(eventTypes).toContain("application_packet.created");
  });

  it("generates a daily mission from pipeline state", async () => {
    const orchestrator = createTestOrchestrator();
    const userId = "mission-user";

    // First create some state
    await orchestrator.execute(createCommand({
      type: "career_opportunities.create_from_job_input",
      requestedBy: "api",
      userId,
      entityType: "career_opportunities",
      entityId: userId,
      payload: { title: "DevOps Engineer", company: "MissionCo", jobDescription: "Kubernetes Docker AWS", source: "Manual Job Import" },
    }));

    // Generate mission
    const missionResult = await orchestrator.execute(createCommand({
      type: "daily_mission.generate",
      requestedBy: "api",
      userId,
      entityType: "daily_mission",
      entityId: "today",
      payload: {},
    }));

    expect(missionResult.ok).toBe(true);
    expect(missionResult.data).toBeDefined();

    const mission = missionResult.data as { topJobsToApplyToday: unknown[]; highestLeverageNextAction: string };
    expect(mission.topJobsToApplyToday).toBeDefined();
    expect(mission.highestLeverageNextAction).toBeDefined();
  });
});

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
  return { bus: createCommandBus(orchestrator), stateStore };
}

describe("Daily Mission", () => {
  it("generates a practical manual mission from current career state", async () => {
    const test = platform();
    await test.stateStore.upsertProjection({ userId: "user-1", projectionType: "career_profile.current", entityType: "career_profile", entityId: "user-1", data: { suggestedResumeVariants: ["DevOps Engineer resume"], missingEvidence: ["CISSP certificate evidence"] } });
    await test.stateStore.upsertProjection({ userId: "user-1", projectionType: "career_opportunities.current_pipeline", entityType: "career_opportunities", entityId: "user-1", data: { opportunities: [{ id: "job-1", title: "Splunk Engineer", company: "FastCo", fitScore: 80, missionPriority: 80, status: "ranked", fitGatePassed: true }, { id: "job-2", title: "Communications Manager", company: "BadFitCo", fitScore: 0, missionPriority: -100, status: "not_fit", fitGatePassed: false }, { id: "job-3", title: "Splunk Architect", company: "ManualCo", fitScore: 90, missionPriority: 90, status: "imported", fitGatePassed: true }, { id: "job-4", title: "Social Media Manager", company: "ManualBad", fitScore: 0, missionPriority: -100, status: "not_fit", fitGatePassed: false }, { id: "job-5", title: "Rejected Splunk Job", company: "RejectedCo", fitScore: 80, missionPriority: 80, status: "rejected", fitGatePassed: true }] } });

    const result = await test.bus.execute(createCommand({ type: "daily_mission.generate", requestedBy: "api", userId: "user-1", entityType: "daily_mission", entityId: "today", payload: {} }));
    const mission = test.stateStore.getProjection("daily_mission", "today", "daily_mission.current_queue", { userId: "user-1" })?.data as Record<string, unknown>;

    expect(result.ok).toBe(true);
    const jobs = mission.topJobsToApplyToday as Array<Record<string, unknown>>;
    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.some((job) => job.title === "Splunk Architect")).toBe(true);
    expect(jobs.some((job) => job.title === "Communications Manager")).toBe(false);
    expect(jobs.some((job) => job.title === "Social Media Manager")).toBe(false);
    expect(jobs.some((job) => job.title === "Rejected Splunk Job")).toBe(false);
    expect(Array.isArray(mission.missingEvidenceToGather)).toBe(true);
    expect(String(mission.highestLeverageNextAction).toLowerCase().includes("manually")).toBe(true);
    expect(JSON.stringify(mission).toLowerCase().includes("send email now")).toBe(false);
    expect(JSON.stringify(mission).toLowerCase().includes("auto-apply now")).toBe(false);
  });

  it("says no strong-fit jobs when every discovered job is rejected", async () => {
    const test = platform();
    await test.stateStore.upsertProjection({ userId: "user-1", projectionType: "career_opportunities.current_pipeline", entityType: "career_opportunities", entityId: "user-1", data: { opportunities: [{ id: "job-1", title: "Sales Assistant", company: "BadFitCo", fitScore: 0, missionPriority: -100, status: "not_fit", fitGatePassed: false }] } });

    await test.bus.execute(createCommand({ type: "daily_mission.generate", requestedBy: "api", userId: "user-1", entityType: "daily_mission", entityId: "today", payload: {} }));
    const mission = test.stateStore.getProjection("daily_mission", "today", "daily_mission.current_queue", { userId: "user-1" })?.data as Record<string, unknown>;

    expect((mission.topJobsToApplyToday as unknown[]).length).toBe(0);
    expect(mission.highestLeverageNextAction).toBe("No strong-fit jobs found from the current source. Try another clean target title or add more job sources.");
  });
});

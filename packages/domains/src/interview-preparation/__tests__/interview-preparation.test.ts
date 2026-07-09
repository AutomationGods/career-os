import { describe, expect, it } from "vitest";
import { InterviewPreparationManager } from "../manager";
import { INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND, INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND } from "../commands";
import { createCommand } from "@career-os/orchestration";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import { snapshotStore } from "@career-os/snapshots";
import { PermissionPolicyService } from "@career-os/orchestration";

function createContext() {
  return { eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService() };
}

describe("InterviewPreparationManager", () => {
  const manager = new InterviewPreparationManager();

  it("canHandle returns true for interview prep commands", () => {
    expect(manager.canHandle(createCommand({ type: INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: "unknown", requestedBy: "api" }))).toBe(false);
  });

  it("generates likely interview questions", async () => {
    const command = createCommand({
      type: INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: { jobTitle: "Splunk Engineer", jobDescription: "SIEM monitoring and alerting" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { count: number }).count).toBeGreaterThan(0);
    expect((result.data as { questions: string[] }).questions.length).toBeGreaterThan(0);
    expect(result.emittedEvents).toContain("interview_prep.questions_generated");
  });

  it("generates talking points from profile facts", async () => {
    const command = createCommand({
      type: INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: { jobTitle: "DevOps Engineer" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { talkingPoints: unknown[] }).talkingPoints.length).toBeGreaterThan(0);
    expect(result.emittedEvents).toContain("interview_prep.talking_points_generated");
  });
});

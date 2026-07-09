import { describe, expect, it } from "vitest";
import { FitScoringManager } from "../manager";
import { FIT_SCORE_CALCULATE_COMMAND, FIT_SCORE_BATCH_COMMAND } from "../commands";
import { createCommand } from "@career-os/orchestration";
import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import { snapshotStore } from "@career-os/snapshots";
import { PermissionPolicyService } from "@career-os/orchestration";

function createContext() {
  return {
    eventStore,
    stateStore,
    snapshotStore,
    permissions: new PermissionPolicyService(),
  };
}

describe("FitScoringManager", () => {
  const manager = new FitScoringManager();

  it("canHandle returns true for supported commands", () => {
    expect(manager.canHandle(createCommand({ type: FIT_SCORE_CALCULATE_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: FIT_SCORE_BATCH_COMMAND, requestedBy: "api" }))).toBe(true);
    expect(manager.canHandle(createCommand({ type: "unknown.command", requestedBy: "api" }))).toBe(false);
  });

  it("calculates fit score for a valid job title", async () => {
    const command = createCommand({
      type: FIT_SCORE_CALCULATE_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: { title: "Splunk Engineer", description: "Splunk SIEM Terraform AWS observability role" },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.data).toBeDefined();
    expect(typeof (result.data as { score: number }).score).toBe("number");
    expect(result.emittedEvents).toContain("fit_score.calculated");
  });

  it("rejects when title is missing", async () => {
    const command = createCommand({
      type: FIT_SCORE_CALCULATE_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: {},
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.error?.code).toBe("TITLE_REQUIRED");
  });

  it("batch scores multiple jobs", async () => {
    const command = createCommand({
      type: FIT_SCORE_BATCH_COMMAND,
      requestedBy: "api",
      userId: "test-user",
      payload: {
        jobs: [
          { title: "Splunk Engineer", description: "SIEM observability" },
          { title: "Marketing Manager", description: "digital marketing campaigns" },
        ],
      },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect((result.data as { count: number }).count).toBe(2);
    expect(result.emittedEvents).toContain("fit_score.batch_completed");
  });

  it("rejects batch when jobs array is empty", async () => {
    const command = createCommand({
      type: FIT_SCORE_BATCH_COMMAND,
      requestedBy: "api",
      payload: { jobs: [] },
    });

    const result = await manager.handle(command, createContext());

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("JOBS_REQUIRED");
  });
});

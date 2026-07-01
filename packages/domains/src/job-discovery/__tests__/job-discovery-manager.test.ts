import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import type { CareerCommand } from "@career-os/shared";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { JobDiscoveryManager, type JobDiscoverySearchPayload } from "../manager";

function createCommand(payload: JobDiscoverySearchPayload = { query: "splunk terraform", limit: 2 }, options: { id?: string; userId?: string; runId?: string } = {}): CareerCommand<JobDiscoverySearchPayload> {
  return {
    id: options.id ?? "command-job-discovery-1",
    type: "job_discovery.search",
    requestedBy: "api",
    userId: options.userId ?? "user-1",
    entityType: "job_discovery_run",
    entityId: options.runId ?? "run-1",
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

function createFetcher(): typeof fetch {
  return async () => new Response(JSON.stringify({
    "job-count": 1,
    jobs: [
      {
        id: 123,
        url: "https://remotive.com/remote-jobs/devops/splunk-engineer-123",
        title: "Splunk Terraform Engineer",
        company_name: "ExampleCo",
        job_type: "full_time",
        candidate_required_location: "Remote",
        description: "<p>Splunk Cribl Terraform AWS observability role.</p>"
      }
    ]
  }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("JobDiscoveryManager", () => {
  it("executes job_discovery.search and writes discovery state", async () => {
    const context = createContext();
    const manager = new JobDiscoveryManager({ fetcher: createFetcher() });

    const result = await manager.handle(createCommand(), context);
    const discoveryEvents = context.eventStore.listByEntity("job_discovery_run", "run-1").map((event) => event.eventType);
    const runProjection = context.stateStore.getProjection("job_discovery_run", "run-1", "job.discovery_run");
    const runData = runProjection?.data as Record<string, unknown> | undefined;

    expect(result.ok).toBe(true);
    expect(result.data?.imported).toBe(1);
    expect(result.data?.jobs[0]?.jobId).toBe("remotive:123");
    expect(result.data?.jobs[0]?.source).toBe("Remotive");
    expect(discoveryEvents.includes("job.discovery_started")).toBe(true);
    expect(discoveryEvents.includes("job.discovery_completed")).toBe(true);
    expect(runData?.runId).toBe("run-1");
    expect(runData?.status).toBe("completed");
    expect(runData?.imported).toBe(1);
  });

  it("feeds discovered jobs into job dashboard segment projections", async () => {
    const context = createContext();
    const manager = new JobDiscoveryManager({ fetcher: createFetcher() });

    await manager.handle(createCommand(), context);
    const jobProjection = context.stateStore.getProjection("job", "remotive:123", "job.dashboard_segment");
    const jobData = jobProjection?.data as Record<string, unknown> | undefined;
    const jobEvents = context.eventStore.listByEntity("job", "remotive:123").map((event) => event.eventType);

    expect(jobData?.jobId).toBe("remotive:123");
    expect(typeof jobData?.fitScore).toBe("number");
    expect(jobEvents.includes("job.pipeline_completed")).toBe(true);
    expect(context.snapshotStore.listBySnapshotType("job.discovery_source_response").length).toBe(1);
  });

  it("keeps same Remotive job projections separate for two users", async () => {
    const context = createContext();
    const manager = new JobDiscoveryManager({ fetcher: createFetcher() });

    await manager.handle(createCommand(undefined, { id: "command-user-1", userId: "user-1", runId: "run-user-1" }), context);
    await manager.handle(createCommand(undefined, { id: "command-user-2", userId: "user-2", runId: "run-user-2" }), context);

    const userOneProjection = context.stateStore.getProjection("job", "remotive:123", "job.dashboard_segment", { userId: "user-1" });
    const userTwoProjection = context.stateStore.getProjection("job", "remotive:123", "job.dashboard_segment", { userId: "user-2" });

    expect(userOneProjection?.userId).toBe("user-1");
    expect(userTwoProjection?.userId).toBe("user-2");
    expect((userOneProjection?.data as Record<string, unknown> | undefined)?.jobId).toBe("remotive:123");
    expect((userTwoProjection?.data as Record<string, unknown> | undefined)?.jobId).toBe("remotive:123");
    expect(context.stateStore.listByEntity("job", "remotive:123").length).toBe(2);
  });
});

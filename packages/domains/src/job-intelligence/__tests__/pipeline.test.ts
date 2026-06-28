import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { InMemoryJobStore } from "../../job-discovery/job-store";
import { runJobPipeline } from "../pipeline";

describe("job pipeline", () => {
  it("processes a remote commercial Splunk role", async () => {
    const result = await runJobPipeline({
      id: "seeded-job",
      title: "Splunk Platform Engineer",
      company: "ExampleCo",
      location: "Remote",
      description: "Splunk Cribl Terraform AWS observability",
      source: "test"
    });

    expect(result.dashboardSegment).toBe("Remote Commercial");
    expect(result.eventsEmitted.includes("job.pipeline_completed")).toBe(true);
  });

  it("writes through injected durable-store contracts without external sending", async () => {
    const durableEvents = new InMemoryEventStore();
    const durableState = new InMemoryStateStore();
    const durableSnapshots = new InMemorySnapshotStore();

    const result = await runJobPipeline(
      {
        id: "durable-job",
        title: "SRE",
        company: "ExampleCo",
        location: "Remote",
        description: "Terraform AWS observability",
        source: "test",
        userId: "user-1"
      },
      { eventStore: durableEvents, stateStore: durableState, snapshotStore: durableSnapshots }
    );

    expect(result.eventsEmitted.length).toBe(7);
    expect(durableEvents.listByEntity("job", "durable-job").length).toBe(7);
    expect(Boolean(durableState.getProjection("job", "durable-job", "job.dashboard_segment"))).toBe(true);
    expect(durableSnapshots.listByEntity("job", "durable-job").length).toBe(1);
  });

  it("persists through an injected job store and emits job.persisted", async () => {
    const durableEvents = new InMemoryEventStore();
    const durableState = new InMemoryStateStore();
    const durableSnapshots = new InMemorySnapshotStore();
    const durableJobs = new InMemoryJobStore();

    const result = await runJobPipeline(
      {
        id: "persisted-job",
        title: "Splunk Platform Engineer",
        company: "ExampleCo",
        location: "Remote",
        description: "Splunk Cribl Terraform AWS observability",
        source: "test",
        userId: "user-1"
      },
      { eventStore: durableEvents, stateStore: durableState, snapshotStore: durableSnapshots, jobStore: durableJobs }
    );

    expect(result.persistedJob?.id).toBe("persisted-job");
    expect(result.eventsEmitted.includes("job.persisted")).toBe(true);
    expect(durableEvents.listByEntity("job", "persisted-job").map((event) => event.eventType).includes("job.persisted")).toBe(true);
    expect(Boolean(durableState.getProjection("job", "persisted-job", "job.pipeline_result"))).toBe(true);
    expect(durableJobs.getById("persisted-job")?.segments[0]?.segment).toBe("Remote Commercial");
  });
});

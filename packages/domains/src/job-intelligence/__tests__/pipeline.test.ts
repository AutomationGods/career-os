import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
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
});

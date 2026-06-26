import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { createCommand } from "../command-bus";
import { createCommandBus, createOrchestrator } from "../orchestrator";

function createTestPlatform() {
  const eventStore = new InMemoryEventStore();
  const stateStore = new InMemoryStateStore();
  const snapshotStore = new InMemorySnapshotStore();
  const orchestrator = createOrchestrator({ eventStore, stateStore, snapshotStore });
  const bus = createCommandBus(orchestrator);
  return { eventStore, stateStore, snapshotStore, orchestrator, bus };
}

describe("Orchestrator", () => {
  it("routes a command to the correct domain manager and emits lifecycle events", async () => {
    const { eventStore, orchestrator } = createTestPlatform();
    const command = createCommand({ type: "daily_mission.generate", requestedBy: "system", entityType: "daily_mission", entityId: "today", payload: {} });
    const result = await orchestrator.execute(command);
    const commandEvents = eventStore.listByEntity("daily_mission", "today").filter((event) => event.eventType.startsWith("command."));

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(commandEvents.map((event) => event.eventType).includes("command.received")).toBe(true);
    expect(commandEvents.map((event) => event.eventType).includes("command.completed")).toBe(true);
  });

  it("rejects commands that are not mapped to the registry", async () => {
    const { orchestrator } = createTestPlatform();
    const result = await orchestrator.execute(createCommand({ type: "unknown.command", requestedBy: "api", payload: {} }));

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("COMMAND_DOMAIN_NOT_REGISTERED");
  });

  it("executes jobs.run_pipeline through command bus and updates stores without forbidden actions", async () => {
    const { bus, eventStore, stateStore, snapshotStore } = createTestPlatform();
    const command = createCommand({
      type: "jobs.run_pipeline",
      requestedBy: "api",
      entityType: "job",
      entityId: "job-command-1",
      payload: {
        title: "Splunk Platform Engineer",
        company: "ExampleCo",
        location: "Remote",
        description: "Splunk Cribl Terraform AWS observability",
        source: "test"
      }
    });
    const result = await bus.execute(command);
    const emittedTypes = eventStore.listByEntity("job", "job-command-1").map((event) => event.eventType);

    expect(result.ok).toBe(true);
    expect(emittedTypes.includes("command.received")).toBe(true);
    expect(emittedTypes.includes("job.pipeline_completed")).toBe(true);
    expect(Boolean(stateStore.getProjection("job", "job-command-1", "job.dashboard_segment"))).toBe(true);
    expect(snapshotStore.listByEntity("job", "job-command-1").length).toBe(1);
    expect(emittedTypes.includes("email.sent")).toBe(false);
    expect(emittedTypes.includes("application.submitted")).toBe(false);
  });
});

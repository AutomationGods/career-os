import { InMemoryEventStore } from "@career-os/events";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { InMemoryJobStore } from "../../job-discovery/job-store";
import { ApplicationPacketManager } from "../manager";
import { InMemoryApplicationPacketStore } from "../services";

function command(type: string, payload: Record<string, unknown>, entityId = payload.jobId ?? payload.id) {
  return {
    id: `command-${type}`,
    type,
    requestedBy: "api" as const,
    userId: "user-1",
    entityType: type.includes("application_packets.create") ? "job" : "application_packet",
    entityId: typeof entityId === "string" ? entityId : undefined,
    payload,
    createdAt: new Date().toISOString()
  };
}

function createJobStore() {
  const jobStore = new InMemoryJobStore();
  jobStore.savePipelineResult({
    jobId: "job-1",
    userId: "user-1",
    sourceSnapshotId: "snapshot-1",
    input: { userId: "user-1", title: "Splunk Platform Engineer", companyName: "ExampleCo", description: "Splunk Cribl Terraform AWS", source: "manual" },
    normalizedJob: { title: "Splunk Platform Engineer", company: "ExampleCo", description: "Splunk Cribl Terraform AWS", source: "manual", raw: {} },
    remoteClassification: "remote",
    clearanceSegment: null,
    certificationClassification: { required: [], preferred: [], blocked: [] },
    fitScore: 75,
    applicationDifficultyScore: 20,
    dashboardSegment: "Remote Commercial"
  });
  return jobStore;
}

function createContext() {
  return {
    eventStore: new InMemoryEventStore(),
    stateStore: new InMemoryStateStore(),
    snapshotStore: {},
    applicationPacketStore: new InMemoryApplicationPacketStore(),
    jobStore: createJobStore()
  };
}

describe("ApplicationPacketManager", () => {
  it("creates packets from persisted jobs and writes projections", async () => {
    const manager = new ApplicationPacketManager();
    const context = createContext();

    const result = await manager.handle(command("application_packets.create", { jobId: "job-1", userId: "user-1" }), context);
    const packet = result.data as { id?: string; selectedJob?: { title?: string }; fitScoreSummary?: { score?: number } };

    expect(result.ok).toBe(true);
    expect(packet.selectedJob?.title).toBe("Splunk Platform Engineer");
    expect(packet.fitScoreSummary?.score).toBe(75);
    expect(context.eventStore.listByType("application_packet.created").length).toBe(1);
    expect(context.stateStore.getProjection("application_packet", packet.id ?? "missing", "application_packet.current")?.projectionType).toBe("application_packet.current");
    expect(context.stateStore.getProjection("application_packet", packet.id ?? "missing", "application_packet.review_queue")?.projectionType).toBe("application_packet.review_queue");
  });

  it("generates deterministic placeholders and updates manual status", async () => {
    const manager = new ApplicationPacketManager();
    const context = createContext();
    const createResult = await manager.handle(command("application_packets.create", { jobId: "job-1", userId: "user-1" }), context);
    const packetId = (createResult.data as { id: string }).id;

    const generated = await manager.handle(command("application_packets.generate_placeholders", { id: packetId }, packetId), context);
    const updated = await manager.handle(command("application_packets.update_status", { id: packetId, status: "ready_to_apply" }, packetId), context);
    const listed = await manager.handle(command("application_packets.list", { userId: "user-1" }, "list"), context);
    const fetched = await manager.handle(command("application_packets.get", { id: packetId }, packetId), context);
    const generatedPacket = generated.data as { coverLetterPlaceholder?: string; status?: string };

    expect(generated.ok).toBe(true);
    expect(generatedPacket.status).toBe("awaiting_review");
    expect(generatedPacket.coverLetterPlaceholder?.includes("Review required")).toBe(true);
    expect(updated.ok).toBe(true);
    expect((updated.data as { status?: string }).status).toBe("ready_to_apply");
    expect(((listed.data as { applicationPackets: unknown[] }).applicationPackets).length).toBe(1);
    expect((fetched.data as { id?: string }).id).toBe(packetId);
    expect(context.eventStore.listByType("resume.placeholder_created").length).toBe(1);
    expect(context.eventStore.listByType("application_packet.status_updated").length).toBe(1);
  });
});

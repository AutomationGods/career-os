import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { createCommand } from "../command-bus";
import { InMemoryApprovalRequestService } from "../approvals";
import { createApprovedReplayCommandBus, createCommandBus, createOrchestrator } from "../orchestrator";
import { PermissionPolicyService } from "../permissions";

function createTestPlatform() {
  const eventStore = new InMemoryEventStore();
  const stateStore = new InMemoryStateStore();
  const snapshotStore = new InMemorySnapshotStore();
  const approvals = new InMemoryApprovalRequestService(eventStore);
  const orchestrator = createOrchestrator({ eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService(), approvals });
  const bus = createCommandBus(orchestrator);
  return { eventStore, stateStore, snapshotStore, approvals, orchestrator, bus };
}

describe("Orchestrator", () => {
  it("registers the public job discovery search command", () => {
    const { orchestrator } = createTestPlatform();

    expect(orchestrator.listCommandTypes().includes("job_discovery.search")).toBe(true);
  });

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
    const { orchestrator, approvals } = createTestPlatform();
    const result = await orchestrator.execute(createCommand({ type: "totally_unknown.submit", requestedBy: "api", payload: {} }));

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("COMMAND_DOMAIN_NOT_REGISTERED");
    expect(approvals.list().length).toBe(0);
  });

  it("approval-required commands do not execute and create approval requests", async () => {
    const { bus, eventStore, approvals } = createTestPlatform();
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", entityType: "email", entityId: "email-1", payload: { subject: "Hello" } });
    const result = await bus.execute(command);
    const emittedTypes = eventStore.listByEntity("email", "email-1").map((event) => event.eventType);

    expect(result.ok).toBe(false);
    expect(result.status).toBe("requires_approval");
    expect(Boolean(result.approvalRequestId)).toBe(true);
    expect(approvals.list().length).toBe(1);
    expect(emittedTypes.includes("approval.requested")).toBe(true);
    expect(emittedTypes.includes("command.requires_approval")).toBe(true);
    expect(emittedTypes.includes("email.sent")).toBe(false);
  });

  it("denied commands return rejected and do not create approvals", async () => {
    const { bus, approvals } = createTestPlatform();
    const result = await bus.execute(createCommand({ type: "application.auto_submit", requestedBy: "api", payload: {} }));

    expect(result.ok).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.error?.code).toBe("COMMAND_DENIED");
    expect(approvals.list().length).toBe(0);
  });

  it("executes approved email replay through the approved replay command bus in demo mode", async () => {
    const { eventStore, orchestrator, stateStore } = createTestPlatform();
    const bus = createApprovedReplayCommandBus(orchestrator);
    const command = createCommand({
      id: "replay-command-1",
      type: "email.send",
      requestedBy: "system",
      userId: "user-1",
      entityType: "email",
      entityId: "email-replay-1",
      payload: { to: "demo@example.invalid", subject: "Demo only" },
      metadata: {
        approvalReplay: true,
        approvalStatus: "approved",
        approvalPermission: "send_email",
        approvalRequestId: "approval-1"
      }
    });

    const result = await bus.execute(command);
    const emittedTypes = eventStore.listByEntity("email", "email-replay-1").map((event) => event.eventType);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(emittedTypes.includes("command.replay_started")).toBe(true);
    expect(emittedTypes.includes("command.replay_completed")).toBe(true);
    expect(Boolean(stateStore.getProjection("email", "email-replay-1", "email.demo_replay"))).toBe(true);
    expect(emittedTypes.includes("email.sent")).toBe(false);
  });

  it("executes resume.generate through command bus without approval", async () => {
    const { bus, approvals, stateStore, snapshotStore } = createTestPlatform();
    const command = createCommand({
      type: "resume.generate",
      requestedBy: "api",
      userId: "user-1",
      entityType: "application_packet",
      entityId: "packet-resume-1",
      payload: {
        jobId: "job-resume-1",
        companyId: "company-resume-1",
        applicationPacketId: "packet-resume-1",
        targetRole: "Splunk Terraform Engineer",
        verifiedFacts: ["Built Terraform modules for AWS observability workloads.", "Administered Splunk and Cribl pipelines for production telemetry."]
      }
    });

    const result = await bus.execute(command);

    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(approvals.list().length).toBe(0);
    expect(Boolean(stateStore.getProjection("application_packet", "packet-resume-1", "resume.current_draft"))).toBe(true);
    expect(snapshotStore.listBySnapshotType("resume.source_input").length).toBe(1);
  });

  it("emits command lifecycle events for generated resume commands", async () => {
    const { bus, eventStore } = createTestPlatform();
    const command = createCommand({
      type: "resume.generate",
      requestedBy: "api",
      userId: "user-1",
      entityType: "application_packet",
      entityId: "packet-resume-2",
      payload: {
        jobId: "job-resume-2",
        companyId: "company-resume-2",
        applicationPacketId: "packet-resume-2",
        verifiedFacts: ["Led incident reviews with engineering teams."]
      }
    });

    const result = await bus.execute(command);
    const emittedTypes = eventStore.listByEntity("application_packet", "packet-resume-2").map((event) => event.eventType);

    expect(result.ok).toBe(true);
    expect(emittedTypes.includes("command.received")).toBe(true);
    expect(emittedTypes.includes("command.accepted")).toBe(true);
    expect(emittedTypes.includes("command.completed")).toBe(true);
  });

  it("executes application_packets.update_status through command bus", async () => {
    const { bus, eventStore, stateStore } = createTestPlatform();
    const createResult = await bus.execute(createCommand({
      type: "application_packets.create",
      requestedBy: "api",
      userId: "user-1",
      entityType: "job",
      entityId: "job-packet-status-1",
      payload: {
        jobId: "job-packet-status-1",
        selectedJob: { title: "Splunk Engineer", company: "ExampleCo", source: "test" },
        selectedCompany: { name: "ExampleCo" },
        fitScoreSummary: { score: 80, segment: "Remote Commercial", highlights: ["Splunk"] }
      }
    }));
    const packet = createResult.data as { id: string };

    const result = await bus.execute(createCommand({
      type: "application_packets.update_status",
      requestedBy: "api",
      userId: "user-1",
      entityType: "application_packet",
      entityId: packet.id,
      payload: { id: packet.id, status: "awaiting_review", note: "Ready for review." }
    }));
    const updated = stateStore.getProjection("application_packet", packet.id, "application_packet.current", { userId: "user-1" })?.data as { status: string; notes: string[] };
    const emittedTypes = eventStore.listByEntity("application_packet", packet.id).map((event) => event.eventType);

    expect(result.ok).toBe(true);
    expect(updated.status).toBe("awaiting_review");
    expect(updated.notes.includes("Ready for review.")).toBe(true);
    expect(emittedTypes.includes("application_packet.status_updated")).toBe(true);
    expect(emittedTypes.includes("application.submitted")).toBe(false);
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

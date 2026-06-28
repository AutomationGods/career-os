import { InMemoryJobStore, InMemoryResumeVersionStore } from "@career-os/domains";
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
  const resumeVersionStore = new InMemoryResumeVersionStore();
  const jobStore = new InMemoryJobStore();
  const orchestrator = createOrchestrator({ eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService(), approvals, resumeVersionStore, jobStore });
  const bus = createCommandBus(orchestrator);
  return { eventStore, stateStore, snapshotStore, approvals, orchestrator, bus, jobStore };
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

  it("imports a manual job and persists pipeline output through the command bus", async () => {
    const { bus, jobStore, stateStore } = createTestPlatform();
    const result = await bus.execute(createCommand({
      type: "jobs.import_manual_url",
      requestedBy: "api",
      userId: "user-1",
      entityType: "job",
      payload: {
        userId: "user-1",
        title: "Splunk Platform Engineer",
        companyName: "ExampleCo",
        location: "Remote",
        description: "Splunk Cribl Terraform AWS observability",
        url: "https://example.test/job",
        requiredFields: ["name", "email"],
        hasEasyApply: true
      }
    }));
    const data = result.data as { job?: { id: string }; externalActionTaken?: boolean };

    expect(result.ok).toBe(true);
    expect(data.externalActionTaken).toBe(false);
    expect(data.job?.id.startsWith("job_")).toBe(true);
    expect(jobStore.list({ userId: "user-1" }).length).toBe(1);
    expect(Boolean(stateStore.getProjection("job", data.job?.id ?? "", "job.current"))).toBe(true);
  });

  it("reruns the job pipeline from only a persisted jobId", async () => {
    const { bus } = createTestPlatform();
    const importResult = await bus.execute(createCommand({
      type: "jobs.import_manual_url",
      requestedBy: "api",
      userId: "user-1",
      entityType: "job",
      payload: { userId: "user-1", title: "Splunk Platform Engineer", companyName: "ExampleCo", location: "Remote", description: "Splunk Cribl Terraform AWS observability" }
    }));
    const imported = importResult.data as { job: { id: string } };
    const rerunResult = await bus.execute(createCommand({
      type: "jobs.run_pipeline",
      requestedBy: "api",
      userId: "user-1",
      entityType: "job",
      entityId: imported.job.id,
      payload: { id: imported.job.id }
    }));
    const rerun = rerunResult.data as { normalizedJob?: { title: string; company: string }; persistedJob?: { id: string } };

    expect(rerunResult.ok).toBe(true);
    expect(rerun.normalizedJob?.title).toBe("Splunk Platform Engineer");
    expect(rerun.normalizedJob?.company).toBe("ExampleCo");
    expect(rerun.persistedJob?.id).toBe(imported.job.id);
  });

  it("creates an application packet from only a persisted jobId", async () => {
    const { bus } = createTestPlatform();
    const importResult = await bus.execute(createCommand({
      type: "jobs.import_manual_url",
      requestedBy: "api",
      userId: "user-1",
      entityType: "job",
      payload: { userId: "user-1", title: "Splunk Platform Engineer", companyName: "ExampleCo", location: "Remote", description: "Splunk Cribl Terraform AWS observability" }
    }));
    const imported = importResult.data as { job: { id: string; companyId?: string } };
    const packetResult = await bus.execute(createCommand({
      type: "application_packets.create",
      requestedBy: "api",
      entityType: "job",
      entityId: imported.job.id,
      payload: { jobId: imported.job.id }
    }));
    const packet = packetResult.data as { jobId: string; selectedJob: { title: string }; selectedCompany?: { name: string }; fitScoreSummary: { score: number } };

    expect(packetResult.ok).toBe(true);
    expect(packet.jobId).toBe(imported.job.id);
    expect(packet.selectedJob.title).toBe("Splunk Platform Engineer");
    expect(packet.selectedCompany?.name).toBe("ExampleCo");
    expect(packet.fitScoreSummary.score > 0).toBe(true);
  });

  it("generates a resume from persisted job context without explicit companyId", async () => {
    const { bus } = createTestPlatform();
    const importResult = await bus.execute(createCommand({
      type: "jobs.import_manual_url",
      requestedBy: "api",
      userId: "user-1",
      entityType: "job",
      payload: { userId: "user-1", title: "Splunk Terraform Engineer", companyName: "ExampleCo", location: "Remote", description: "Splunk Cribl Terraform AWS observability" }
    }));
    const imported = importResult.data as { job: { id: string } };
    const resumeResult = await bus.execute(createCommand({
      type: "resume.generate",
      requestedBy: "api",
      userId: "user-1",
      entityType: "application_packet",
      entityId: "packet-persisted-job",
      payload: {
        jobId: imported.job.id,
        applicationPacketId: "packet-persisted-job",
        verifiedFacts: ["Built Terraform modules for AWS observability workloads.", "Administered Splunk and Cribl pipelines for production telemetry."]
      }
    }));
    const resume = resumeResult.data as { draft?: { companyId: string; jobId: string; content: string } };

    expect(resumeResult.ok).toBe(true);
    expect(resume.draft?.jobId).toBe(imported.job.id);
    expect(resume.draft?.companyId.startsWith("company_")).toBe(true);
    expect(Boolean(resume.draft?.content.includes("Splunk Terraform Engineer"))).toBe(true);
  });
});

import { InMemoryApplicationPacketStore, InMemoryJobStore, InMemoryResumeVersionStore } from "@career-os/domains";
import { InMemoryEventStore } from "@career-os/events";
import { createCommand, createCommandBus, createOrchestrator, InMemoryApprovalRequestService, PermissionPolicyService } from "@career-os/orchestration";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { getJob, importManualJob, listJobs, runJobPipeline } from "../api/jobs/_handlers";
import { buildSafeDemoJobPayload, groupJobsByDashboardSegment, jobsFromListEnvelope } from "./jobs-panel-model";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resultFromEnvelope(envelope: unknown) {
  if (!isRecord(envelope) || !isRecord(envelope.data) || !isRecord(envelope.data.result)) return {};
  return envelope.data.result;
}

async function responseJson(response: Response) {
  return await response.json() as unknown;
}

function authRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-career-os-test-user-id", "e2e-user");
  headers.set("x-career-os-test-user-email", "e2e-user@example.com");
  if (init.method && init.method !== "GET") headers.set("origin", "http://localhost");
  return new Request(`http://localhost${path}`, { ...init, headers });
}

function createE2EPlatform() {
  const eventStore = new InMemoryEventStore();
  const stateStore = new InMemoryStateStore();
  const snapshotStore = new InMemorySnapshotStore();
  const approvals = new InMemoryApprovalRequestService(eventStore);
  const jobStore = new InMemoryJobStore();
  const resumeVersionStore = new InMemoryResumeVersionStore();
  const applicationPacketStore = new InMemoryApplicationPacketStore();
  const orchestrator = createOrchestrator({
    eventStore,
    stateStore,
    snapshotStore,
    approvals,
    jobStore,
    resumeVersionStore,
    applicationPacketStore,
    permissions: new PermissionPolicyService()
  });
  return { bus: createCommandBus(orchestrator), eventStore, stateStore, snapshotStore, jobStore };
}

describe("persisted job discovery E2E", () => {
  it("imports a manual job, lists/gets/reruns it, then hydrates packet and resume generation from jobId", async () => {
    const { bus, eventStore, stateStore, snapshotStore, jobStore } = createE2EPlatform();
    const manualJob = buildSafeDemoJobPayload({
      userId: "e2e-user",
      url: "https://example.test/jobs/e2e-splunk-cribl",
      title: "Senior Splunk / Cribl Platform Engineer",
      companyName: "E2E Observability Co",
      description: "Manual pasted job description for Splunk, Cribl, Terraform, AWS, Linux, SIEM, and observability engineering. Remote commercial role.",
      requiredFields: ["name", "email", "resume", "work authorization"],
      hasEasyApply: false
    });

    const importResponse = await importManualJob(authRequest("/api/jobs/import", {
      method: "POST",
      body: JSON.stringify(manualJob)
    }), bus);
    const importBody = await responseJson(importResponse);
    const importResult = resultFromEnvelope(importBody);
    const importedJob = isRecord(importResult.job) ? importResult.job : {};
    const jobId = typeof importedJob.id === "string" ? importedJob.id : "";

    expect(importResponse.status).toBe(201);
    expect(jobId.startsWith("job_")).toBe(true);
    expect(importResult.externalActionTaken).toBe(false);
    expect(Array.isArray(importedJob.sources) && importedJob.sources.length > 0).toBe(true);
    expect(isRecord(importedJob.latestSnapshot)).toBe(true);
    expect(Array.isArray(importedJob.segments) && importedJob.segments.length > 0).toBe(true);
    expect(Array.isArray(importedJob.fitScores) && importedJob.fitScores.length > 0).toBe(true);
    expect(Array.isArray(importedJob.difficultyScores) && importedJob.difficultyScores.length > 0).toBe(true);

    const listResponse = await listJobs(authRequest("/api/jobs?userId=e2e-user"), bus);
    const listBody = await responseJson(listResponse);
    const listedJobs = jobsFromListEnvelope(listBody);
    const groupedJobs = groupJobsByDashboardSegment(listedJobs);

    expect(listResponse.status).toBe(200);
    expect(listedJobs.some((job) => job.id === jobId)).toBe(true);
    expect(Boolean(groupedJobs["Remote Commercial"]?.some((job) => job.id === jobId))).toBe(true);

    const getResponse = await getJob(jobId, authRequest(`/api/jobs/${jobId}`), bus);
    const getBody = await responseJson(getResponse);
    const getResult = resultFromEnvelope(getBody);
    const fetchedJob = isRecord(getResult.job) ? getResult.job : {};

    expect(getResponse.status).toBe(200);
    expect(fetchedJob.id).toBe(jobId);
    expect(fetchedJob.title).toBe(manualJob.title);

    const rerunResponse = await runJobPipeline(jobId, authRequest(`/api/jobs/${jobId}/run-pipeline`, {
      method: "POST",
      body: JSON.stringify({ userId: "e2e-user" })
    }), bus);
    const rerunBody = await responseJson(rerunResponse);
    const rerunResult = resultFromEnvelope(rerunBody);
    const rerunNormalizedJob = isRecord(rerunResult.normalizedJob) ? rerunResult.normalizedJob : {};

    expect(rerunResponse.status).toBe(200);
    expect(rerunNormalizedJob.title).toBe(manualJob.title);
    expect(rerunNormalizedJob.company).toBe(manualJob.companyName);
    expect(jobStore.getById(jobId)?.latestPipelineResult?.dashboardSegment).toBe("Remote Commercial");

    const packetResult = await bus.execute(createCommand({
      type: "application_packets.create",
      requestedBy: "api",
      userId: "e2e-user",
      entityType: "job",
      entityId: jobId,
      payload: { jobId }
    }));
    const packet = isRecord(packetResult.data) ? packetResult.data : {};
    const selectedJob = isRecord(packet.selectedJob) ? packet.selectedJob : {};
    const selectedCompany = isRecord(packet.selectedCompany) ? packet.selectedCompany : {};

    expect(packetResult.ok).toBe(true);
    expect(packet.jobId).toBe(jobId);
    expect(selectedJob.title).toBe(manualJob.title);
    expect(selectedCompany.name).toBe(manualJob.companyName);

    const resumeResult = await bus.execute(createCommand({
      type: "resume.generate",
      requestedBy: "api",
      userId: "e2e-user",
      entityType: "application_packet",
      entityId: "packet-e2e-job-discovery",
      payload: {
        jobId,
        applicationPacketId: "packet-e2e-job-discovery",
        verifiedFacts: [
          "Built Splunk SIEM dashboards and saved searches for security monitoring.",
          "Implemented Cribl pipelines for routing, filtering, and normalizing observability data.",
          "Managed Terraform modules for cloud observability infrastructure."
        ]
      }
    }));
    const resumeData = isRecord(resumeResult.data) ? resumeResult.data : {};
    const draft = isRecord(resumeData.draft) ? resumeData.draft : {};
    const guard = isRecord(resumeData.guard) ? resumeData.guard : {};

    expect(resumeResult.ok).toBe(true);
    expect(draft.jobId).toBe(jobId);
    expect(typeof draft.companyId === "string" && draft.companyId.startsWith("company_")).toBe(true);
    expect(typeof draft.content === "string" && draft.content.includes(manualJob.title)).toBe(true);
    expect(guard.ok).toBe(true);

    expect(Boolean(stateStore.getProjection("job", jobId, "job.current"))).toBe(true);
    expect(Boolean(stateStore.getProjection("job", jobId, "job.pipeline_result"))).toBe(true);
    expect(snapshotStore.listByEntity("job", jobId).length >= 2).toBe(true);

    const emittedTypes = eventStore.listRecent(200).map((event) => event.eventType);
    expect(emittedTypes.includes("job.imported")).toBe(true);
    expect(emittedTypes.includes("job.persisted")).toBe(true);
    expect(emittedTypes.includes("resume.generated")).toBe(true);
    expect(emittedTypes.includes("email.sent")).toBe(false);
    expect(emittedTypes.includes("application.submitted")).toBe(false);
  });
});

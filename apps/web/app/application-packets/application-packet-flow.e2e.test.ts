import { InMemoryApplicationPacketStore, InMemoryDocumentExportStore, InMemoryJobStore, InMemoryProfileFactsStore, InMemoryResumeVersionStore } from "@career-os/domains";
import { InMemoryEventStore } from "@career-os/events";
import { createCommand, createCommandBus, createOrchestrator, InMemoryApprovalRequestService, PermissionPolicyService } from "@career-os/orchestration";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { createDocumentExport } from "../api/documents/_handlers";
import { importManualJob } from "../api/jobs/_handlers";
import { buildSafeDemoJobPayload } from "../jobs/jobs-panel-model";
import { createApplicationPacket, generateApplicationPacketPlaceholders, updateApplicationPacketStatus } from "../api/application-packets/_handlers";

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
  const documentExportStore = new InMemoryDocumentExportStore();
  const applicationPacketStore = new InMemoryApplicationPacketStore();
  const profileFactsStore = new InMemoryProfileFactsStore();
  const orchestrator = createOrchestrator({
    eventStore,
    stateStore,
    snapshotStore,
    approvals,
    jobStore,
    resumeVersionStore,
    documentExportStore,
    applicationPacketStore,
    profileFactsStore,
    permissions: new PermissionPolicyService()
  });
  return { bus: createCommandBus(orchestrator), eventStore, stateStore, snapshotStore, jobStore, resumeVersionStore, documentExportStore, applicationPacketStore };
}

describe("application packet apply loop E2E", () => {
  it("imports a job, creates a packet, generates drafts, creates/exports a resume, and records manual status only", async () => {
    const { bus, eventStore, stateStore, applicationPacketStore, documentExportStore } = createE2EPlatform();
    const manualJob = buildSafeDemoJobPayload({
      userId: "e2e-user",
      url: "https://example.test/jobs/apply-loop",
      title: "Senior Splunk / Cribl Platform Engineer",
      companyName: "E2E Apply Loop Co",
      description: "Splunk, Cribl, Terraform, AWS, Linux, SIEM, and observability engineering. Remote commercial role.",
      hasEasyApply: false
    });

    const importResponse = await importManualJob(authRequest("/api/jobs/import", {
      method: "POST",
      body: JSON.stringify(manualJob)
    }), bus);
    const importedResult = resultFromEnvelope(await responseJson(importResponse));
    const importedJob = isRecord(importedResult.job) ? importedResult.job : {};
    const jobId = typeof importedJob.id === "string" ? importedJob.id : "";

    expect(importResponse.status).toBe(201);
    expect(jobId.startsWith("job_")).toBe(true);

    const packetResponse = await createApplicationPacket(authRequest("/api/application-packets", {
      method: "POST",
      body: JSON.stringify({ userId: "e2e-user", jobId })
    }), bus);
    const packetResult = resultFromEnvelope(await responseJson(packetResponse));
    const packetId = typeof packetResult.id === "string" ? packetResult.id : "";

    expect(packetResponse.status).toBe(201);
    expect(packetResult.jobId).toBe(jobId);
    expect(applicationPacketStore.getById(packetId)?.selectedJob.title).toBe(manualJob.title);

    const generateResponse = await generateApplicationPacketPlaceholders(packetId, authRequest(`/api/application-packets/${packetId}/generate-placeholders`, { method: "POST", body: JSON.stringify({}) }), bus);
    const generatedPacket = resultFromEnvelope(await responseJson(generateResponse));

    expect(generateResponse.status).toBe(200);
    expect(generatedPacket.status).toBe("awaiting_review");
    expect(typeof generatedPacket.coverLetterPlaceholder === "string" && generatedPacket.coverLetterPlaceholder.includes("Review required")).toBe(true);
    expect(applicationPacketStore.getById(packetId)?.nextAction.includes("Review")).toBe(true);

    const resumeResult = await bus.execute(createCommand({
      type: "resume.generate",
      requestedBy: "api",
      userId: "e2e-user",
      entityType: "application_packet",
      entityId: packetId,
      payload: {
        userId: "e2e-user",
        jobId,
        applicationPacketId: packetId,
        verifiedFacts: [
          "Built Splunk SIEM dashboards and saved searches for security monitoring.",
          "Implemented Cribl pipelines for routing, filtering, and normalizing observability data.",
          "Managed Terraform modules for cloud observability infrastructure."
        ]
      }
    }));
    const resumeData = isRecord(resumeResult.data) ? resumeResult.data : {};
    const draft = isRecord(resumeData.draft) ? resumeData.draft : {};
    const resumeVersion = isRecord(resumeData.resumeVersion) ? resumeData.resumeVersion : {};
    const resumeVersionId = typeof resumeVersion.id === "string" ? resumeVersion.id : "";

    expect(resumeResult.ok).toBe(true);
    expect(draft.jobId).toBe(jobId);
    expect(resumeVersionId).toBe(draft.id);

    const exportResponse = await createDocumentExport(authRequest("/api/documents/export", {
      method: "POST",
      body: JSON.stringify({ userId: "e2e-user", resumeVersionId, format: "markdown" })
    }), bus);
    const exportResult = resultFromEnvelope(await responseJson(exportResponse));
    const exported = isRecord(exportResult.export) ? exportResult.export : {};

    expect(exportResponse.status).toBe(201);
    expect(typeof exported.id === "string" && exported.id.startsWith("document_export_")).toBe(true);
    expect(documentExportStore.list({ userId: "e2e-user" }).length).toBe(1);

    const readyResponse = await updateApplicationPacketStatus(packetId, authRequest(`/api/application-packets/${packetId}/status`, {
      method: "POST",
      body: JSON.stringify({ userId: "e2e-user", status: "ready_to_apply" })
    }), bus);
    const submittedResponse = await updateApplicationPacketStatus(packetId, authRequest(`/api/application-packets/${packetId}/status`, {
      method: "POST",
      body: JSON.stringify({ userId: "e2e-user", status: "submitted" })
    }), bus);

    expect(readyResponse.status).toBe(200);
    expect(submittedResponse.status).toBe(200);
    expect(applicationPacketStore.getById(packetId)?.status).toBe("submitted");
    expect(Boolean(stateStore.getProjection("application_packet", packetId, "application_packet.current"))).toBe(true);

    const emittedTypes = eventStore.listRecent(500).map((event) => event.eventType);
    expect(emittedTypes.includes("job.imported")).toBe(true);
    expect(emittedTypes.includes("application_packet.created")).toBe(true);
    expect(emittedTypes.includes("resume.generated")).toBe(true);
    expect(emittedTypes.includes("document_export.markdown_generated")).toBe(true);
    expect(emittedTypes.includes("application_packet.status_updated")).toBe(true);
    expect(emittedTypes.includes("email.sent")).toBe(false);
    expect(emittedTypes.includes("application.submitted")).toBe(false);
    expect(emittedTypes.includes("file.uploaded")).toBe(false);
    expect(emittedTypes.includes("browser.used")).toBe(false);
  });
});

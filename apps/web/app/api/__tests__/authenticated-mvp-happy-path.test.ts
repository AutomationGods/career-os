import type { CareerCommand, CommandResult } from "@career-os/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const busMock = vi.hoisted(() => ({
  commands: [] as CareerCommand[],
  execute: vi.fn()
}));

vi.mock("@career-os/orchestration", async () => {
  const actual = await vi.importActual("@career-os/orchestration") as typeof import("@career-os/orchestration");
  return {
    ...actual,
    createDefaultCommandBus: () => ({ execute: busMock.execute })
  };
});

import { createApplicationPacket, updateApplicationPacketStatus } from "../application-packets/_handlers";
import { createDocumentExport } from "../documents/_handlers";
import { importManualJob, runJobPipeline } from "../jobs/_handlers";
import { importMasterResume } from "../master-resume/_handlers";
import { createProfileFact, verifyProfileFact } from "../profile-facts/_handlers";
import { POST as generateResume } from "../resumes/route";

function jsonRequest(path: string, body: unknown, userId = "user-alpha") {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "x-career-os-test-user-id": userId,
      "x-career-os-test-user-email": `${userId}@example.com`
    },
    body: JSON.stringify(body)
  });
}

function okResult(command: CareerCommand, data: unknown): CommandResult {
  return { ok: true, status: "completed", commandId: command.id, data };
}

function payloadUserId(command: CareerCommand) {
  return (command.payload as { userId?: string }).userId;
}

const testBus = { execute: busMock.execute };

describe("authenticated MVP apply loop", () => {
  beforeEach(() => {
    busMock.commands.length = 0;
    busMock.execute.mockReset();
    busMock.execute.mockImplementation(async (command: CareerCommand): Promise<CommandResult> => {
      busMock.commands.push(command);
      switch (command.type) {
        case "jobs.import_manual_url":
          return okResult(command, { job: { id: "job-1", userId: command.userId, title: "Platform Engineer" } });
        case "jobs.run_pipeline":
          return okResult(command, { jobId: command.entityId, dashboardSegment: "Remote Commercial" });
        case "application_packets.create":
          return okResult(command, { id: "packet-1", userId: command.userId, jobId: command.entityId, status: "draft" });
        case "profile_facts.create":
          return okResult(command, { id: "fact-1", userId: command.userId, verificationStatus: "needs_review" });
        case "profile_facts.verify":
          return okResult(command, { id: command.entityId, userId: command.userId, verificationStatus: "verified" });
        case "master_resume.import":
          return okResult(command, { masterResume: { id: "master-1", userId: command.userId }, candidateFacts: [], reviewQueue: [], skippedCandidates: [] });
        case "resume.generate":
          return okResult(command, { resumeVersion: { id: "resume-1", userId: command.userId, applicationPacketId: command.entityId } });
        case "document_exports.create_markdown":
          return okResult(command, { export: { id: "export-1", userId: command.userId, resumeVersionId: command.entityId }, downloadUrl: "/api/documents/exports/export-1/download" });
        case "application_packets.update_status":
          return okResult(command, { id: command.entityId, userId: command.userId, status: "submitted" });
        default:
          return { ok: false, status: "rejected", commandId: command.id, error: { code: "UNEXPECTED_COMMAND", message: command.type } };
      }
    });
  });

  it("runs Jobs → Packets → Profile Facts / Master Resume → Resume → Documents → manual status under the authenticated user", async () => {
    const maliciousUserId = "attacker-user";

    const jobResponse = await importManualJob(jsonRequest("/api/jobs/import", {
      userId: maliciousUserId,
      title: "Platform Engineer",
      companyName: "ExampleCo",
      description: "Build observability automation with Terraform and Splunk."
    }), testBus);
    await runJobPipeline("job-1", jsonRequest("/api/jobs/job-1/run-pipeline", { userId: maliciousUserId }), testBus);

    const packetResponse = await createApplicationPacket(jsonRequest("/api/application-packets", { userId: maliciousUserId, jobId: "job-1" }), testBus);

    const factResponse = await createProfileFact(jsonRequest("/api/profile-facts", {
      userId: maliciousUserId,
      factType: "skill",
      label: "Terraform automation",
      value: "Built Terraform modules for production infrastructure."
    }), testBus);
    await verifyProfileFact("fact-1", jsonRequest("/api/profile-facts/fact-1/verify", { userId: maliciousUserId }), testBus);

    const masterResumeResponse = await importMasterResume(jsonRequest("/api/master-resume/import", {
      userId: maliciousUserId,
      resumeText: "Terraform, Splunk, incident response, platform engineering."
    }), testBus);

    const resumeResponse = await generateResume(jsonRequest("/api/resumes", {
      userId: maliciousUserId,
      jobId: "job-1",
      applicationPacketId: "packet-1",
      targetRole: "Platform Engineer",
      verifiedFacts: ["Built Terraform modules for production infrastructure."]
    }));

    const documentResponse = await createDocumentExport(jsonRequest("/api/documents/export", { userId: maliciousUserId, resumeVersionId: "resume-1", format: "markdown" }), testBus);
    const statusResponse = await updateApplicationPacketStatus("packet-1", jsonRequest("/api/application-packets/packet-1/status", { userId: maliciousUserId, status: "submitted" }), testBus);

    expect(jobResponse.status).toBe(201);
    expect(packetResponse.status).toBe(201);
    expect(factResponse.status).toBe(201);
    expect(masterResumeResponse.status).toBe(201);
    expect(resumeResponse.status).toBe(201);
    expect(documentResponse.status).toBe(201);
    expect(statusResponse.status).toBe(200);
    const commands = busMock.commands as CareerCommand[];
    expect(commands.map((command) => command.type)).toEqual([
      "jobs.import_manual_url",
      "jobs.run_pipeline",
      "application_packets.create",
      "profile_facts.create",
      "profile_facts.verify",
      "master_resume.import",
      "resume.generate",
      "document_exports.create_markdown",
      "application_packets.update_status"
    ]);
    expect(commands.every((command) => command.userId === "user-alpha")).toBe(true);
    expect(commands.every((command) => payloadUserId(command) === "user-alpha")).toBe(true);
  });
});

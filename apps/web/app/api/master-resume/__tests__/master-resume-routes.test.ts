import type { CareerCommand, CommandResult } from "@career-os/shared";
import { describe, expect, it } from "vitest";
import { getMasterResume, importMasterResume, masterResumeGetSchema, masterResumeImportSchema } from "../_handlers";

function authRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-career-os-test-user-id", "demo-user");
  headers.set("x-career-os-test-user-email", "demo-user@example.com");
  if (init.method && init.method !== "GET") headers.set("origin", "http://localhost");
  return new Request(`http://localhost${path}`, { ...init, headers });
}

describe("master resume route schemas", () => {
  it("accepts safe import payloads", () => {
    const parsed = masterResumeImportSchema.safeParse({ userId: "demo-user", resumeText: "Skills: Splunk and Cribl" });

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.source : "").toBe("pasted_plain_text");
  });

  it("rejects empty resume text", () => {
    const parsed = masterResumeImportSchema.safeParse({ userId: "demo-user", resumeText: "" });

    expect(parsed.success).toBe(false);
  });

  it("allows get requests without client userId because auth supplies ownership", () => {
    const parsed = masterResumeGetSchema.safeParse({});

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.userId : "fallback").toBe(undefined);
  });
});

describe("master resume handlers", () => {
  it("sends import commands through the command bus", async () => {
    let capturedCommand: CareerCommand | undefined;
    const bus = {
      async execute(command: CareerCommand): Promise<CommandResult> {
        capturedCommand = command;
        return {
          ok: true,
          status: "completed",
          commandId: command.id,
          data: { masterResume: { id: "master-1", userId: command.userId, content: { rawText: "Skills: Splunk", source: "pasted_plain_text", importedAt: "2026-06-27T00:00:00.000Z", parseVersion: "master-resume-parser-v1", candidateFacts: [], stats: { rawTextLength: 14, candidateFactCount: 0 } } }, candidateFacts: [], reviewQueue: [], skippedCandidates: [] }
        };
      }
    };

    const response = await importMasterResume(authRequest("/api/master-resume/import", { method: "POST", body: JSON.stringify({ userId: "attacker", resumeText: "Skills: Splunk" }) }), bus);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(capturedCommand?.type).toBe("master_resume.import");
    expect(capturedCommand?.entityId).toBe("demo-user");
    expect(capturedCommand?.userId).toBe("demo-user");
  });

  it("sends get commands through the command bus", async () => {
    let capturedCommand: CareerCommand | undefined;
    const bus = {
      async execute(command: CareerCommand): Promise<CommandResult> {
        capturedCommand = command;
        return { ok: true, status: "completed", commandId: command.id, data: { masterResume: undefined, reviewQueue: [] } };
      }
    };

    const response = await getMasterResume(authRequest("/api/master-resume?userId=attacker"), bus);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(capturedCommand?.type).toBe("master_resume.get");
    expect(capturedCommand?.entityId).toBe("demo-user");
  });
});

import type { CareerCommand, CommandResult } from "@career-os/shared";
import { describe, expect, it } from "vitest";
import { createDocumentExport, documentExportCreateSchema, documentExportListSchema, getDocumentExport, listDocumentExports } from "../_handlers";

describe("document export route schemas", () => {
  it("accepts markdown export payloads with a resume version", () => {
    const parsed = documentExportCreateSchema.safeParse({ userId: "demo-user", resumeVersionId: "resume-1", format: "markdown" });

    expect(parsed.success).toBe(true);
  });

  it("rejects export payloads without a source resume", () => {
    const parsed = documentExportCreateSchema.safeParse({ format: "docx" });

    expect(parsed.success).toBe(false);
  });

  it("defaults document export list limit", () => {
    const parsed = documentExportListSchema.safeParse({});

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.limit : 0).toBe(50);
  });
});

describe("document export handlers", () => {
  it("routes markdown export through the command bus", async () => {
    let capturedCommand: CareerCommand | undefined;
    const bus = {
      async execute(command: CareerCommand): Promise<CommandResult> {
        capturedCommand = command;
        return { ok: true, status: "completed", commandId: command.id, data: { export: { id: "export-1" }, downloadUrl: "/api/documents/exports/export-1/download" } };
      }
    };

    const response = await createDocumentExport(new Request("http://localhost/api/documents/export", { method: "POST", body: JSON.stringify({ userId: "demo-user", resumeVersionId: "resume-1", format: "markdown" }) }), bus);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(capturedCommand?.type).toBe("document_exports.create_markdown");
    expect(capturedCommand?.entityId).toBe("resume-1");
  });

  it("routes docx export through the command bus", async () => {
    let capturedCommand: CareerCommand | undefined;
    const bus = {
      async execute(command: CareerCommand): Promise<CommandResult> {
        capturedCommand = command;
        return { ok: true, status: "completed", commandId: command.id, data: { export: { id: "export-2" } } };
      }
    };

    const response = await createDocumentExport(new Request("http://localhost/api/documents/export", { method: "POST", body: JSON.stringify({ resumeVersionId: "resume-2", format: "docx" }) }), bus);

    expect(response.status).toBe(201);
    expect(capturedCommand?.type).toBe("document_exports.create_docx");
  });

  it("routes get and list through document export commands", async () => {
    const commands: string[] = [];
    const bus = {
      async execute(command: CareerCommand): Promise<CommandResult> {
        commands.push(command.type);
        return { ok: true, status: "completed", commandId: command.id, data: command.type === "document_exports.list" ? { exports: [] } : { export: { id: command.entityId } } };
      }
    };

    await listDocumentExports(new Request("http://localhost/api/documents/exports?userId=demo-user"), bus);
    await getDocumentExport("export-1", bus);

    expect(commands.join("|")).toBe("document_exports.list|document_exports.get");
  });
});

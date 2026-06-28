import { createCommand, createDefaultCommandBus, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";

export const documentExportCreateSchema = z.object({
  userId: z.string().min(1).optional(),
  resumeVersionId: z.string().min(1).optional(),
  resumeDraft: z.unknown().optional(),
  blockedProfileClaims: z.array(z.string().min(1)).optional().default([]),
  format: z.enum(["markdown", "docx"])
}).refine((value) => Boolean(value.resumeVersionId || value.resumeDraft), { message: "resumeVersionId or resumeDraft is required", path: ["resumeVersionId"] });

export const documentExportListSchema = z.object({
  userId: z.string().min(1).optional(),
  format: z.enum(["markdown", "docx"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const documentExportGetSchema = z.object({
  id: z.string().min(1)
});

type BusLike = Pick<CommandBus, "execute">;

function busOrDefault(bus?: BusLike) {
  return bus ?? createDefaultCommandBus();
}

export async function createDocumentExport(request: Request, bus?: BusLike) {
  const parsed = documentExportCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid document export payload.", "INVALID_DOCUMENT_EXPORT_REQUEST", 400);
  const commandType = parsed.data.format === "docx" ? "document_exports.create_docx" : "document_exports.create_markdown";
  const entityId = parsed.data.resumeVersionId ?? (typeof parsed.data.resumeDraft === "object" && parsed.data.resumeDraft && "id" in parsed.data.resumeDraft ? String((parsed.data.resumeDraft as { id?: unknown }).id) : "resume-export");
  const command = createCommand({ type: commandType, requestedBy: "api", entityType: "resume", entityId, payload: parsed.data });
  return commandResult(await busOrDefault(bus).execute(command), 201, 400);
}

export async function listDocumentExports(request: Request, bus?: BusLike) {
  const query = documentExportListSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return fail("Invalid document export list query.", "INVALID_DOCUMENT_EXPORT_LIST", 400);
  const command = createCommand({ type: "document_exports.list", requestedBy: "api", entityType: "document_export", entityId: "list", payload: query.data });
  return commandResult(await busOrDefault(bus).execute(command));
}

export async function getDocumentExport(id: string, bus?: BusLike) {
  const parsed = documentExportGetSchema.safeParse({ id });
  if (!parsed.success) return fail("Invalid document export id.", "INVALID_DOCUMENT_EXPORT_ID", 400);
  const command = createCommand({ type: "document_exports.get", requestedBy: "api", entityType: "document_export", entityId: parsed.data.id, payload: parsed.data });
  return commandResult(await busOrDefault(bus).execute(command));
}

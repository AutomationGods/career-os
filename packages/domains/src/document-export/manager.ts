import { createResumeExportArtifact, type ResumeExportDraft, type ResumeExportFormat } from "@career-os/documents";
import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { prismaResumeVersionStore, type ResumeVersionStore } from "../resume-factory/resume-version-store";
import { documentExportCapability } from "./capabilities";
import { prismaDocumentExportStore, type DocumentExportRecord, type DocumentExportStore } from "./document-export-store";

export const DOCUMENT_EXPORT_CREATE_MARKDOWN_COMMAND = "document_exports.create_markdown";
export const DOCUMENT_EXPORT_CREATE_DOCX_COMMAND = "document_exports.create_docx";
export const DOCUMENT_EXPORT_GET_COMMAND = "document_exports.get";
export const DOCUMENT_EXPORT_LIST_COMMAND = "document_exports.list";
export const DOCUMENT_EXPORT_REQUESTED_EVENT = "document_export.requested";
export const DOCUMENT_EXPORT_MARKDOWN_GENERATED_EVENT = "document_export.markdown_generated";
export const DOCUMENT_EXPORT_DOCX_GENERATED_EVENT = "document_export.docx_generated";
export const DOCUMENT_EXPORT_FAILED_EVENT = "document_export.failed";
export const RESUME_EXPORT_MARKDOWN_GENERATED_EVENT = "resume.export_markdown_generated";
export const RESUME_EXPORT_DOCX_GENERATED_EVENT = "resume.export_docx_generated";
export const DOCUMENT_EXPORT_CURRENT_STATUS_PROJECTION = "document_export.current_status";
export const RESUME_CURRENT_EXPORTS_PROJECTION = "resume.current_exports";
export const DOCUMENT_EXPORT_SOURCE_SNAPSHOT = "document_export.source_resume";

export const DOCUMENT_EXPORT_COMMANDS = [DOCUMENT_EXPORT_CREATE_MARKDOWN_COMMAND, DOCUMENT_EXPORT_CREATE_DOCX_COMMAND, DOCUMENT_EXPORT_GET_COMMAND, DOCUMENT_EXPORT_LIST_COMMAND];

export const definition: DomainDefinition = {
  name: "Document Export Domain",
  slug: "document-export",
  manager: "Document Export Manager",
  capabilities: ["DocumentExportCapability"],
  workers: ["DocumentExportWorker"],
  tools: ["MarkdownExportTool", "DocxExportTool", "TruthfulnessExportGuardTool"],
  commands: DOCUMENT_EXPORT_COMMANDS,
  events: [DOCUMENT_EXPORT_REQUESTED_EVENT, DOCUMENT_EXPORT_MARKDOWN_GENERATED_EVENT, DOCUMENT_EXPORT_DOCX_GENERATED_EVENT, DOCUMENT_EXPORT_FAILED_EVENT, RESUME_EXPORT_MARKDOWN_GENERATED_EVENT, RESUME_EXPORT_DOCX_GENERATED_EVENT],
  permissions: ["export_document"],
  dependencies: ["resume-factory", "document-intelligence", "event-store", "state-store", "snapshot-store"],
  status: "implemented",
  version: "1.0.0"
};

export interface DocumentExportRequest {
  userId?: string;
  resumeVersionId?: string;
  resumeDraft?: ResumeExportDraft;
  blockedProfileClaims?: string[];
}

export interface DocumentExportResult {
  export: DocumentExportRecord;
  downloadUrl: string;
  warningText: string;
  sourceSnapshotId: string;
  externalActionTaken: false;
}

type DocumentExportPayload = Partial<DocumentExportRequest> & { id?: unknown; format?: unknown; limit?: unknown; userId?: unknown; resumeDraft?: unknown; blockedProfileClaims?: unknown };

type DocumentExportContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
  resumeVersionStore?: ResumeVersionStore;
  documentExportStore?: DocumentExportStore;
};

function isPayload(value: unknown): value is DocumentExportPayload {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringFrom(value: unknown) {
  const text = stringFrom(value);
  return text.length > 0 ? text : undefined;
}

function stringArrayFrom(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function numberFrom(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatForCommand(commandType: string): ResumeExportFormat {
  return commandType === DOCUMENT_EXPORT_CREATE_DOCX_COMMAND ? "docx" : "markdown";
}

function validationError(command: CareerCommand, code: string, message: string): CommandResult {
  return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
}

function normalizeDraft(value: unknown): ResumeExportDraft | undefined {
  if (!value || typeof value !== "object") return undefined;
  const draft = value as ResumeExportDraft;
  if (!draft.id || !Array.isArray(draft.sections)) return undefined;
  return draft;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ").replace(/\s+/g, " ").trim();
}

function containsBlockedClaim(content: string, blockedClaim: string) {
  const normalizedContent = ` ${normalizeText(content)} `;
  const normalizedClaim = normalizeText(blockedClaim).replace(/\+/g, " plus ");
  if (!normalizedClaim) return false;
  return normalizedContent.includes(` ${normalizedClaim} `) || normalizedContent.includes(` ${normalizeText(blockedClaim)} `);
}

function validateDraftForExport(draft: ResumeExportDraft, blockedClaims: string[]) {
  const sourceFacts = new Set((draft.sourceFacts ?? []).map((fact) => fact.trim()).filter(Boolean));
  const bullets = draft.sections.flatMap((section) => section.bullets.map((bullet) => bullet.trim()).filter(Boolean));
  const ungroundedBullets = bullets.filter((bullet) => !sourceFacts.has(bullet));
  if (ungroundedBullets.length > 0) {
    return { ok: false as const, code: "DOCUMENT_EXPORT_TRUTHFULNESS_FAILED", message: "Document export blocked because resume bullets are not grounded in source facts.", details: { ungroundedBullets } };
  }

  const content = bullets.join("\n");
  const blockedInContent = blockedClaims.filter((claim) => containsBlockedClaim(content, claim));
  if (blockedInContent.length > 0) {
    return { ok: false as const, code: "DOCUMENT_EXPORT_BLOCKED_CLAIMS_FOUND", message: "Document export blocked because content contains blocked claims.", details: { blockedClaims: blockedInContent } };
  }

  return { ok: true as const };
}

async function resolveDraft(request: DocumentExportRequest, context: DocumentExportContext) {
  const directDraft = normalizeDraft(request.resumeDraft);
  if (directDraft) return directDraft;
  if (!request.resumeVersionId) return undefined;
  const resumeVersionStore = context.resumeVersionStore ?? prismaResumeVersionStore;
  const version = await resumeVersionStore.getById(request.resumeVersionId, request.userId);
  return normalizeDraft(version?.content);
}

function exportEventType(format: ResumeExportFormat) {
  return format === "markdown" ? DOCUMENT_EXPORT_MARKDOWN_GENERATED_EVENT : DOCUMENT_EXPORT_DOCX_GENERATED_EVENT;
}

function resumeExportEventType(format: ResumeExportFormat) {
  return format === "markdown" ? RESUME_EXPORT_MARKDOWN_GENERATED_EVENT : RESUME_EXPORT_DOCX_GENERATED_EVENT;
}

async function currentResumeExports(context: DocumentExportContext, resumeDraftId: string) {
  const projection = await context.stateStore.getProjection("resume", resumeDraftId, RESUME_CURRENT_EXPORTS_PROJECTION);
  const data = projection?.data;
  if (!data || typeof data !== "object" || !Array.isArray((data as { exports?: unknown }).exports)) return [];
  return (data as { exports: unknown[] }).exports;
}

export class DocumentExportManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [documentExportCapability];

  canHandle(command: CareerCommand) {
    return DOCUMENT_EXPORT_COMMANDS.includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    if (!isPayload(command.payload)) return validationError(command, "DOCUMENT_EXPORT_PAYLOAD_REQUIRED", "Document export commands require an object payload.");
    const executionContext = context as DocumentExportContext;
    const exportStore = executionContext.documentExportStore ?? prismaDocumentExportStore;
    const payload = command.payload;

    if (command.type === DOCUMENT_EXPORT_GET_COMMAND) {
      const id = optionalStringFrom(payload.id ?? command.entityId);
      const userId = optionalStringFrom(payload.userId ?? command.userId);
      if (!id) return validationError(command, "DOCUMENT_EXPORT_ID_REQUIRED", "Document export id is required.");
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "document_exports.get requires an authenticated user id.");
      const record = await exportStore.getById(id, userId);
      if (!record) return validationError(command, "DOCUMENT_EXPORT_NOT_FOUND", "Document export not found.");
      return { ok: true, status: "completed", commandId: command.id, data: { export: record } };
    }

    if (command.type === DOCUMENT_EXPORT_LIST_COMMAND) {
      const userId = optionalStringFrom(payload.userId ?? command.userId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "document_exports.list requires an authenticated user id.");
      const exports = await exportStore.list({ userId, format: payload.format === "markdown" || payload.format === "docx" ? payload.format : undefined, limit: Math.min(numberFrom(payload.limit, 50), 100) });
      return { ok: true, status: "completed", commandId: command.id, data: { exports } };
    }

    const request: DocumentExportRequest = {
      userId: optionalStringFrom(payload.userId ?? command.userId),
      resumeVersionId: optionalStringFrom(payload.resumeVersionId ?? command.entityId),
      resumeDraft: normalizeDraft(payload.resumeDraft),
      blockedProfileClaims: stringArrayFrom(payload.blockedProfileClaims)
    };
    if (!request.userId) return validationError(command, "USER_ID_REQUIRED", "Document export requires an authenticated user id.");
    const format = formatForCommand(command.type);
    const draft = await resolveDraft(request, executionContext);
    const resumeDraftId = draft?.id ?? request.resumeVersionId ?? command.entityId ?? command.id;

    const requestedEvent = await executionContext.eventStore.append({
      eventType: DOCUMENT_EXPORT_REQUESTED_EVENT,
      entityType: "resume",
      entityId: resumeDraftId,
      domain: definition.slug,
      manager: definition.manager,
      capability: "DocumentExportCapability",
      worker: "DocumentExportWorker",
      userId: command.userId,
      payload: { commandId: command.id, format, resumeVersionId: request.resumeVersionId, localOnly: true, externalActionTaken: false },
      confidence: 1
    });

    if (!draft) {
      await executionContext.eventStore.append({
        eventType: DOCUMENT_EXPORT_FAILED_EVENT,
        entityType: "resume",
        entityId: resumeDraftId,
        domain: definition.slug,
        manager: definition.manager,
        capability: "DocumentExportCapability",
        worker: "DocumentExportWorker",
        userId: command.userId,
        payload: { commandId: command.id, format, reason: "RESUME_DRAFT_REQUIRED" },
        evidence: { requestedEventId: requestedEvent.id },
        confidence: 1
      });
      return validationError(command, "RESUME_DRAFT_REQUIRED", "Document export requires a persisted resumeVersionId or resumeDraft payload.");
    }

    const validation = validateDraftForExport(draft, request.blockedProfileClaims ?? []);
    if (!validation.ok) {
      await executionContext.eventStore.append({
        eventType: DOCUMENT_EXPORT_FAILED_EVENT,
        entityType: "resume",
        entityId: draft.id,
        domain: definition.slug,
        manager: definition.manager,
        capability: "DocumentExportCapability",
        worker: "TruthfulnessExportGuardTool",
        userId: command.userId,
        payload: { commandId: command.id, format, reason: validation.code, details: validation.details },
        evidence: { requestedEventId: requestedEvent.id, blockedProfileClaims: request.blockedProfileClaims },
        confidence: 1
      });
      return { ok: false, status: "rejected", commandId: command.id, error: { code: validation.code, message: validation.message, details: validation.details } };
    }

    const sourceSnapshot = await executionContext.snapshotStore.captureSnapshot({
      userId: request.userId,
      entityType: "resume",
      entityId: draft.id,
      snapshotType: DOCUMENT_EXPORT_SOURCE_SNAPSHOT,
      source: DOCUMENT_EXPORT_SOURCE_SNAPSHOT,
      data: { commandId: command.id, format, resumeVersionId: request.resumeVersionId, draft, blockedProfileClaims: request.blockedProfileClaims ?? [], localOnly: true }
    });

    const artifact = createResumeExportArtifact({ draft, format });
    const savedExport = await exportStore.save({
      userId: request.userId,
      documentType: "resume",
      format,
      filename: artifact.filename,
      mimeType: artifact.mimeType,
      checksum: artifact.checksum,
      byteLength: artifact.byteLength,
      textContent: format === "markdown" ? artifact.textContent : undefined,
      contentBase64: format === "docx" ? artifact.bytes.toString("base64") : undefined,
      warningText: artifact.warningText,
      sourceResumeDraftId: draft.id,
      sourceResumeVersionId: request.resumeVersionId,
      sourceSnapshotId: sourceSnapshot.id
    });

    const generatedEvent = await executionContext.eventStore.append({
      eventType: exportEventType(format),
      entityType: "document_export",
      entityId: savedExport.id,
      domain: definition.slug,
      manager: definition.manager,
      capability: "DocumentExportCapability",
      worker: "DocumentExportWorker",
      userId: command.userId,
      payload: { commandId: command.id, exportId: savedExport.id, format, filename: artifact.filename, mimeType: artifact.mimeType, byteLength: artifact.byteLength, checksum: artifact.checksum, localOnly: true, externalActionTaken: false },
      evidence: { requestedEventId: requestedEvent.id, sourceSnapshotId: sourceSnapshot.id, sourceResumeDraftId: draft.id },
      confidence: 1
    });

    await executionContext.eventStore.append({
      eventType: resumeExportEventType(format),
      entityType: "resume",
      entityId: draft.id,
      domain: definition.slug,
      manager: definition.manager,
      capability: "DocumentExportCapability",
      worker: "DocumentExportWorker",
      userId: command.userId,
      payload: { commandId: command.id, exportId: savedExport.id, format, filename: artifact.filename, localOnly: true, externalActionTaken: false },
      evidence: { documentExportEventId: generatedEvent.id, sourceSnapshotId: sourceSnapshot.id },
      confidence: 1
    });

    await executionContext.stateStore.upsertProjection({
      userId: request.userId,
      projectionType: DOCUMENT_EXPORT_CURRENT_STATUS_PROJECTION,
      entityType: "document_export",
      entityId: savedExport.id,
      sourceEventId: generatedEvent.id,
      data: { status: "generated", export: savedExport, downloadUrl: `/api/documents/exports/${savedExport.id}/download`, localOnly: true, externalActionTaken: false, updatedAt: new Date().toISOString() },
      updatedAt: new Date()
    });

    const existingExports = await currentResumeExports(executionContext, draft.id);
    await executionContext.stateStore.upsertProjection({
      userId: request.userId,
      projectionType: RESUME_CURRENT_EXPORTS_PROJECTION,
      entityType: "resume",
      entityId: draft.id,
      sourceEventId: generatedEvent.id,
      data: { resumeDraftId: draft.id, exports: [{ id: savedExport.id, format, filename: artifact.filename, downloadUrl: `/api/documents/exports/${savedExport.id}/download`, checksum: artifact.checksum, byteLength: artifact.byteLength, createdAt: savedExport.createdAt.toISOString() }, ...existingExports], updatedAt: new Date().toISOString() },
      updatedAt: new Date()
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { export: savedExport, downloadUrl: `/api/documents/exports/${savedExport.id}/download`, warningText: artifact.warningText, sourceSnapshotId: sourceSnapshot.id, externalActionTaken: false },
      emittedEvents: [DOCUMENT_EXPORT_REQUESTED_EVENT, exportEventType(format), resumeExportEventType(format)],
      updatedProjections: [DOCUMENT_EXPORT_CURRENT_STATUS_PROJECTION, RESUME_CURRENT_EXPORTS_PROJECTION]
    };
  }
}

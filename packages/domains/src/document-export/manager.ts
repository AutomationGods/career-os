import { createHash } from "node:crypto";
import type { EventStore } from "@career-os/events";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";

export const DOCUMENTS_EXPORT_COMMAND = "documents.export";
export const DOCUMENT_LOCAL_EXPORTED_EVENT = "document.local_exported";
export const DOCUMENT_LOCAL_EXPORT_PROJECTION = "document.local_export";

export const definition: DomainDefinition = {
  name: "Document Export Domain",
  slug: "document-export",
  manager: "Document Export Manager",
  capabilities: ["LocalDocumentExportCapability"],
  workers: ["LocalMarkdownExportWorker"],
  tools: ["LocalMarkdownExportTool"],
  commands: [DOCUMENTS_EXPORT_COMMAND],
  events: [DOCUMENT_LOCAL_EXPORTED_EVENT],
  permissions: ["export_document"],
  dependencies: ["event-store", "state-store"],
  status: "implemented",
  version: "1.0.0"
};

export interface LocalDocumentExportRequest {
  applicationPacketId: string;
  documentType: "resume_markdown" | "markdown";
  draftId?: string;
  filename: string;
  markdown: string;
}

export interface LocalDocumentExportResult {
  applicationPacketId: string;
  documentType: LocalDocumentExportRequest["documentType"];
  draftId?: string;
  filename: string;
  format: "markdown";
  delivery: "local_download";
  checksum: string;
  exportedAt: string;
}

type DocumentExportContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validationError(command: CareerCommand, code: string, message: string): CommandResult {
  return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
}

function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildRequest(command: CareerCommand): LocalDocumentExportRequest | CommandResult {
  if (!isRecord(command.payload)) return validationError(command, "DOCUMENT_EXPORT_PAYLOAD_REQUIRED", "Document export requires an object payload.");
  const applicationPacketId = stringFrom(command.payload.applicationPacketId ?? command.entityId);
  const filename = stringFrom(command.payload.filename);
  const markdown = stringFrom(command.payload.markdown);
  const documentType = command.payload.documentType === "markdown" ? "markdown" : "resume_markdown";
  const draftId = stringFrom(command.payload.draftId) || undefined;

  if (!applicationPacketId) return validationError(command, "APPLICATION_PACKET_ID_REQUIRED", "applicationPacketId is required for local export.");
  if (!filename.endsWith(".md")) return validationError(command, "MARKDOWN_FILENAME_REQUIRED", "Local export filename must end with .md.");
  if (!markdown) return validationError(command, "MARKDOWN_REQUIRED", "Local markdown content is required for export metadata.");

  return { applicationPacketId, documentType, draftId, filename, markdown };
}

function isCommandResult(value: LocalDocumentExportRequest | CommandResult): value is CommandResult {
  return "ok" in value && "status" in value && "commandId" in value;
}

export class DocumentExportManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "LocalDocumentExportCapability",
      description: "Records local markdown document exports only; it does not upload, submit, send, or contact anyone.",
      workers: ["LocalMarkdownExportWorker"],
      commands: [DOCUMENTS_EXPORT_COMMAND],
      events: [DOCUMENT_LOCAL_EXPORTED_EVENT],
      permissions: ["export_document"]
    }
  ];

  canHandle(command: CareerCommand) {
    return command.type === DOCUMENTS_EXPORT_COMMAND;
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult<LocalDocumentExportResult>> {
    const requestOrError = buildRequest(command);
    if (isCommandResult(requestOrError)) return requestOrError as CommandResult<LocalDocumentExportResult>;

    const request = requestOrError;
    const exportedAt = new Date().toISOString();
    const result: LocalDocumentExportResult = {
      applicationPacketId: request.applicationPacketId,
      documentType: request.documentType,
      draftId: request.draftId,
      filename: request.filename,
      format: "markdown",
      delivery: "local_download",
      checksum: checksum(request.markdown),
      exportedAt
    };
    const executionContext = context as DocumentExportContext;
    const event = await executionContext.eventStore.append({
      eventType: DOCUMENT_LOCAL_EXPORTED_EVENT,
      entityType: "application_packet",
      entityId: request.applicationPacketId,
      domain: this.domainSlug,
      manager: definition.manager,
      capability: "LocalDocumentExportCapability",
      worker: "LocalMarkdownExportWorker",
      userId: command.userId,
      payload: result,
      evidence: { localOnly: true, noUpload: true, noSubmission: true, noExternalSend: true },
      confidence: 1
    });

    await executionContext.stateStore.upsertProjection({
      userId: command.userId,
      projectionType: DOCUMENT_LOCAL_EXPORT_PROJECTION,
      entityType: "application_packet",
      entityId: request.applicationPacketId,
      sourceEventId: event.id,
      data: result,
      updatedAt: new Date(exportedAt)
    });

    return { ok: true, status: "completed", commandId: command.id, data: result, emittedEvents: [DOCUMENT_LOCAL_EXPORTED_EVENT], updatedProjections: [DOCUMENT_LOCAL_EXPORT_PROJECTION] };
  }
}

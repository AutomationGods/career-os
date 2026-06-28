import { prisma as defaultPrisma } from "@career-os/db";
import type { ResumeExportFormat } from "@career-os/documents";

export interface DocumentExportContent {
  format: ResumeExportFormat;
  filename: string;
  mimeType: string;
  checksum: string;
  byteLength: number;
  textContent?: string;
  contentBase64?: string;
  warningText: string;
  sourceResumeDraftId: string;
  sourceResumeVersionId?: string;
}

export interface DocumentExportMetadata {
  userId?: string;
  documentExportId: string;
  sourceResumeDraftId: string;
  sourceResumeVersionId?: string;
  sourceSnapshotId?: string;
  localOnly: true;
  externalActionTaken: false;
  storage: "database_json_local_only";
  filename: string;
  mimeType: string;
  checksum: string;
  byteLength: number;
  warningText: string;
}

export interface DocumentExportRecord {
  id: string;
  documentType: string;
  format: ResumeExportFormat;
  url?: string;
  createdAt: Date;
  content?: DocumentExportContent;
  metadata?: DocumentExportMetadata;
}

export interface DocumentExportSaveInput {
  id?: string;
  userId?: string;
  documentType: "resume";
  format: ResumeExportFormat;
  filename: string;
  mimeType: string;
  checksum: string;
  byteLength: number;
  textContent?: string;
  contentBase64?: string;
  warningText: string;
  sourceResumeDraftId: string;
  sourceResumeVersionId?: string;
  sourceSnapshotId?: string;
  createdAt?: Date;
}

export interface DocumentExportListInput {
  userId?: string;
  format?: ResumeExportFormat;
  limit?: number;
}

export interface DocumentExportStore {
  save(input: DocumentExportSaveInput): Promise<DocumentExportRecord> | DocumentExportRecord;
  getById(id: string): Promise<DocumentExportRecord | undefined> | DocumentExportRecord | undefined;
  list(input?: DocumentExportListInput): Promise<DocumentExportRecord[]> | DocumentExportRecord[];
}

type PrismaDocumentExportLike = {
  documentExport?: {
    create(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
  documentVersion?: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
  documentMetadata?: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
  $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

function createDocumentExportId() {
  return `document_export_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseJsonValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function normalizeExportRow(row: unknown): Pick<DocumentExportRecord, "id" | "documentType" | "format" | "url" | "createdAt"> | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as { id?: unknown; documentType?: unknown; format?: unknown; url?: unknown; createdAt?: unknown };
  if (typeof record.id !== "string" || typeof record.documentType !== "string" || (record.format !== "markdown" && record.format !== "docx")) return undefined;
  return {
    id: record.id,
    documentType: record.documentType,
    format: record.format,
    url: typeof record.url === "string" ? record.url : undefined,
    createdAt: new Date(record.createdAt instanceof Date || typeof record.createdAt === "string" ? record.createdAt : new Date())
  };
}

function normalizeVersionContent(row: unknown): DocumentExportContent | undefined {
  if (!row || typeof row !== "object") return undefined;
  const content = parseJsonValue((row as { content?: unknown }).content);
  if (!content || typeof content !== "object") return undefined;
  const record = content as DocumentExportContent;
  if (record.format !== "markdown" && record.format !== "docx") return undefined;
  return record;
}

function normalizeMetadata(row: unknown): DocumentExportMetadata | undefined {
  if (!row || typeof row !== "object") return undefined;
  const metadata = parseJsonValue((row as { metadata?: unknown }).metadata);
  if (!metadata || typeof metadata !== "object") return undefined;
  return metadata as DocumentExportMetadata;
}

function localUrlFor(id: string, filename: string) {
  return `local://career-os/document-exports/${id}/${filename}`;
}

export class InMemoryDocumentExportStore implements DocumentExportStore {
  private exports = new Map<string, DocumentExportRecord>();

  save(input: DocumentExportSaveInput) {
    const id = input.id ?? createDocumentExportId();
    const content: DocumentExportContent = {
      format: input.format,
      filename: input.filename,
      mimeType: input.mimeType,
      checksum: input.checksum,
      byteLength: input.byteLength,
      textContent: input.textContent,
      contentBase64: input.contentBase64,
      warningText: input.warningText,
      sourceResumeDraftId: input.sourceResumeDraftId,
      sourceResumeVersionId: input.sourceResumeVersionId
    };
    const metadata: DocumentExportMetadata = {
      userId: input.userId,
      documentExportId: id,
      sourceResumeDraftId: input.sourceResumeDraftId,
      sourceResumeVersionId: input.sourceResumeVersionId,
      sourceSnapshotId: input.sourceSnapshotId,
      localOnly: true,
      externalActionTaken: false,
      storage: "database_json_local_only",
      filename: input.filename,
      mimeType: input.mimeType,
      checksum: input.checksum,
      byteLength: input.byteLength,
      warningText: input.warningText
    };
    const record: DocumentExportRecord = {
      id,
      documentType: input.documentType,
      format: input.format,
      url: localUrlFor(id, input.filename),
      createdAt: input.createdAt ?? new Date(),
      content,
      metadata
    };
    this.exports.set(id, record);
    return record;
  }

  getById(id: string) {
    return this.exports.get(id);
  }

  list(input: DocumentExportListInput = {}) {
    const limit = input.limit ?? 50;
    return [...this.exports.values()]
      .filter((record) => !input.userId || record.metadata?.userId === input.userId)
      .filter((record) => !input.format || record.format === input.format)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  clear() {
    this.exports.clear();
  }
}

export class PrismaDocumentExportStore implements DocumentExportStore {
  constructor(private readonly client: PrismaDocumentExportLike = defaultPrisma as unknown as PrismaDocumentExportLike) {}

  async save(input: DocumentExportSaveInput) {
    const id = input.id ?? createDocumentExportId();
    const createdAt = input.createdAt ?? new Date();
    const url = localUrlFor(id, input.filename);
    const content: DocumentExportContent = {
      format: input.format,
      filename: input.filename,
      mimeType: input.mimeType,
      checksum: input.checksum,
      byteLength: input.byteLength,
      textContent: input.textContent,
      contentBase64: input.contentBase64,
      warningText: input.warningText,
      sourceResumeDraftId: input.sourceResumeDraftId,
      sourceResumeVersionId: input.sourceResumeVersionId
    };
    const metadata: DocumentExportMetadata = {
      userId: input.userId,
      documentExportId: id,
      sourceResumeDraftId: input.sourceResumeDraftId,
      sourceResumeVersionId: input.sourceResumeVersionId,
      sourceSnapshotId: input.sourceSnapshotId,
      localOnly: true,
      externalActionTaken: false,
      storage: "database_json_local_only",
      filename: input.filename,
      mimeType: input.mimeType,
      checksum: input.checksum,
      byteLength: input.byteLength,
      warningText: input.warningText
    };

    if (this.client.documentExport && this.client.documentVersion && this.client.documentMetadata) {
      const exportRow = await this.client.documentExport.create({ data: { id, documentType: input.documentType, format: input.format, url, createdAt } });
      await this.client.documentVersion.create({ data: { id: `document_version_${id}`, documentType: input.documentType, documentId: id, content, createdAt } });
      await this.client.documentMetadata.create({ data: { id: `document_metadata_${id}`, documentType: input.documentType, documentId: id, metadata } });
      const normalized = normalizeExportRow(exportRow);
      if (!normalized) throw new Error("Failed to persist document export.");
      return { ...normalized, content, metadata };
    }

    return this.rawSave({ id, createdAt, url, documentType: input.documentType, format: input.format, content, metadata });
  }

  async getById(id: string) {
    if (this.client.documentExport) {
      const exportRow = normalizeExportRow(await this.client.documentExport.findUnique({ where: { id } }));
      if (!exportRow) return undefined;
      const versionRow = this.client.documentVersion ? await this.client.documentVersion.findFirst({ where: { documentType: exportRow.documentType, documentId: id }, orderBy: { createdAt: "desc" } }) : undefined;
      const metadataRow = this.client.documentMetadata ? await this.client.documentMetadata.findFirst({ where: { documentType: exportRow.documentType, documentId: id } }) : undefined;
      return { ...exportRow, content: normalizeVersionContent(versionRow), metadata: normalizeMetadata(metadataRow) };
    }

    return this.rawGetById(id);
  }

  async list(input: DocumentExportListInput = {}) {
    const limit = input.limit ?? 50;
    const rows = this.client.documentExport
      ? await this.client.documentExport.findMany({ take: limit * 3, orderBy: { createdAt: "desc" }, where: input.format ? { format: input.format } : undefined })
      : await this.rawListRows(limit * 3, input.format);
    const hydrated: DocumentExportRecord[] = [];
    for (const row of rows) {
      const normalized = normalizeExportRow(row);
      if (!normalized) continue;
      const record = await this.getById(normalized.id);
      if (record) hydrated.push(record);
    }
    return hydrated.filter((record) => !input.userId || record.metadata?.userId === input.userId).slice(0, limit);
  }

  private async rawSave(input: { id: string; createdAt: Date; url: string; documentType: string; format: ResumeExportFormat; content: DocumentExportContent; metadata: DocumentExportMetadata }) {
    if (!this.client.$queryRawUnsafe) throw new Error("DOCUMENT_EXPORT_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose document export models or raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    const exportRows = await this.client.$queryRawUnsafe<unknown[]>(`INSERT INTO "DocumentExport" (id, "documentType", format, url, "createdAt") VALUES ($1, $2, $3, $4, $5) RETURNING *`, input.id, input.documentType, input.format, input.url, input.createdAt);
    await this.client.$queryRawUnsafe(`INSERT INTO "DocumentVersion" (id, "documentType", "documentId", content, "createdAt") VALUES ($1, $2, $3, $4::jsonb, $5)`, `document_version_${input.id}`, input.documentType, input.id, JSON.stringify(input.content), input.createdAt);
    await this.client.$queryRawUnsafe(`INSERT INTO "DocumentMetadata" (id, "documentType", "documentId", metadata) VALUES ($1, $2, $3, $4::jsonb)`, `document_metadata_${input.id}`, input.documentType, input.id, JSON.stringify(input.metadata));
    const normalized = normalizeExportRow(exportRows[0]);
    if (!normalized) throw new Error("Failed to persist document export.");
    return { ...normalized, content: input.content, metadata: input.metadata };
  }

  private async rawGetById(id: string) {
    if (!this.client.$queryRawUnsafe) return undefined;
    const exportRows = await this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "DocumentExport" WHERE id = $1 LIMIT 1`, id);
    const exportRow = normalizeExportRow(exportRows[0]);
    if (!exportRow) return undefined;
    const versionRows = await this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "DocumentVersion" WHERE "documentType" = $1 AND "documentId" = $2 ORDER BY "createdAt" DESC LIMIT 1`, exportRow.documentType, id);
    const metadataRows = await this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "DocumentMetadata" WHERE "documentType" = $1 AND "documentId" = $2 LIMIT 1`, exportRow.documentType, id);
    return { ...exportRow, content: normalizeVersionContent(versionRows[0]), metadata: normalizeMetadata(metadataRows[0]) };
  }

  private rawListRows(limit: number, format?: ResumeExportFormat) {
    if (!this.client.$queryRawUnsafe) throw new Error("DOCUMENT_EXPORT_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose document export models or raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    if (format) return this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "DocumentExport" WHERE format = $1 ORDER BY "createdAt" DESC LIMIT $2`, format, limit);
    return this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "DocumentExport" ORDER BY "createdAt" DESC LIMIT $1`, limit);
  }
}

export const documentExportStore = new InMemoryDocumentExportStore();
export const prismaDocumentExportStore = new PrismaDocumentExportStore();

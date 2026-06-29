import { createHash } from "node:crypto";
import { prisma as defaultPrisma } from "@career-os/db";

export interface SnapshotInput<T = unknown> {
  id?: string;
  userId?: string;
  entityType: string;
  entityId: string;
  snapshotType?: string;
  source?: string;
  data?: T;
  content?: T;
  checksum?: string;
  hash?: string;
  createdAt?: Date;
  capturedAt?: Date;
}

export interface SnapshotRecord<T = unknown> {
  id: string;
  userId?: string;
  entityType: string;
  entityId: string;
  snapshotType: string;
  source: string;
  data: T;
  content: T;
  checksum: string;
  hash: string;
  createdAt: Date;
  capturedAt: Date;
}

export interface SnapshotDiffSummary {
  equal: boolean;
  checksumA: string;
  checksumB: string;
  changedTopLevelKeys: string[];
  summary: string;
}

export interface SnapshotStore {
  captureSnapshot<T>(snapshot: SnapshotInput<T>): SnapshotRecord<T> | Promise<SnapshotRecord<T>>;
  capture<T>(snapshot: SnapshotInput<T>): SnapshotRecord<T> | Promise<SnapshotRecord<T>>;
  getSnapshot(id: string, currentUserId?: string): SnapshotRecord | undefined | Promise<SnapshotRecord | undefined>;
  listByEntity(entityType: string, entityId: string, currentUserId?: string): SnapshotRecord[] | Promise<SnapshotRecord[]>;
  listBySnapshotType(snapshotType: string, currentUserId?: string): SnapshotRecord[] | Promise<SnapshotRecord[]>;
  listByUser(userId: string): SnapshotRecord[] | Promise<SnapshotRecord[]>;
  listRecent(limit: number, currentUserId?: string): SnapshotRecord[] | Promise<SnapshotRecord[]>;
  compareSnapshots(snapshotA: SnapshotRecord | string, snapshotB: SnapshotRecord | string): SnapshotDiffSummary | Promise<SnapshotDiffSummary>;
}

type PrismaLike = {
  snapshot?: {
    create(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
  };
  $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

function createSnapshotId() {
  return `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

function checksum(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function snapshotData<T>(snapshot: SnapshotInput<T>): T {
  return (snapshot.data ?? snapshot.content ?? {}) as T;
}

function normalizeSnapshot<T>(snapshot: SnapshotInput<T>, id = snapshot.id ?? createSnapshotId()): SnapshotRecord<T> {
  const data = snapshotData(snapshot);
  const digest = snapshot.checksum ?? snapshot.hash ?? checksum(data);
  const createdAt = snapshot.createdAt ?? snapshot.capturedAt ?? new Date();
  const snapshotType = snapshot.snapshotType ?? snapshot.source ?? "generic.snapshot";
  return {
    id,
    userId: snapshot.userId,
    entityType: snapshot.entityType,
    entityId: snapshot.entityId,
    snapshotType,
    source: snapshot.source ?? snapshotType,
    data,
    content: data,
    checksum: digest,
    hash: digest,
    createdAt,
    capturedAt: createdAt
  };
}

function parseJsonValue(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function toRecord(row: unknown): SnapshotRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as SnapshotRecord & { data?: unknown; content?: unknown; checksum?: string; hash?: string; createdAt?: Date; capturedAt?: Date };
  const data = parseJsonValue(record.data ?? record.content ?? {});
  const digest = record.checksum ?? record.hash ?? checksum(data);
  const createdAt = new Date(record.createdAt ?? record.capturedAt ?? new Date());
  return {
    ...record,
    snapshotType: record.snapshotType ?? record.source,
    source: record.source ?? record.snapshotType,
    data,
    content: data,
    checksum: digest,
    hash: digest,
    createdAt,
    capturedAt: createdAt
  };
}

function toRecords(rows: unknown[]): SnapshotRecord[] {
  return rows.map(toRecord).filter((row): row is SnapshotRecord => Boolean(row));
}

function changedTopLevelKeys(a: unknown, b: unknown) {
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) || Array.isArray(b)) {
    return stableStringify(a) === stableStringify(b) ? [] : ["<root>"];
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter((key) => stableStringify(left[key]) !== stableStringify(right[key])).sort();
}

export function compareSnapshotRecords(snapshotA: SnapshotRecord, snapshotB: SnapshotRecord): SnapshotDiffSummary {
  const changed = changedTopLevelKeys(snapshotA.data, snapshotB.data);
  const equal = snapshotA.checksum === snapshotB.checksum;
  return {
    equal,
    checksumA: snapshotA.checksum,
    checksumB: snapshotB.checksum,
    changedTopLevelKeys: changed,
    summary: equal ? "Snapshots are identical." : `Snapshots differ in ${changed.length} top-level key(s).`
  };
}

export class InMemorySnapshotStore implements SnapshotStore {
  private snapshots: SnapshotRecord[] = [];

  captureSnapshot<T>(snapshot: SnapshotInput<T>) {
    const saved = normalizeSnapshot(snapshot);
    this.snapshots.push(saved);
    return saved;
  }

  capture<T>(snapshot: SnapshotInput<T>) {
    return this.captureSnapshot(snapshot);
  }

  getSnapshot(id: string, currentUserId?: string) {
    const snapshot = this.snapshots.find((item) => item.id === id);
    if (!snapshot || (currentUserId && snapshot.userId !== currentUserId)) return undefined;
    return snapshot;
  }

  listByEntity(entityType: string, entityId: string, currentUserId?: string) {
    return this.snapshots.filter((snapshot) => snapshot.entityType === entityType && snapshot.entityId === entityId && (!currentUserId || snapshot.userId === currentUserId));
  }

  listBySnapshotType(snapshotType: string, currentUserId?: string) {
    return this.snapshots.filter((snapshot) => snapshot.snapshotType === snapshotType && (!currentUserId || snapshot.userId === currentUserId));
  }

  listByUser(userId: string) {
    return this.snapshots.filter((snapshot) => snapshot.userId === userId);
  }

  listRecent(limit: number, currentUserId?: string) {
    return [...this.snapshots].filter((snapshot) => !currentUserId || snapshot.userId === currentUserId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  compareSnapshots(snapshotA: SnapshotRecord | string, snapshotB: SnapshotRecord | string) {
    const left = typeof snapshotA === "string" ? this.getSnapshot(snapshotA) : snapshotA;
    const right = typeof snapshotB === "string" ? this.getSnapshot(snapshotB) : snapshotB;
    if (!left || !right) throw new Error("Snapshot not found for comparison");
    return compareSnapshotRecords(left, right);
  }

  list() {
    return [...this.snapshots];
  }

  clear() {
    this.snapshots = [];
  }
}

export class PrismaSnapshotStore implements SnapshotStore {
  constructor(private readonly client: PrismaLike = defaultPrisma as unknown as PrismaLike) {}

  async captureSnapshot<T>(snapshot: SnapshotInput<T>) {
    const normalized = normalizeSnapshot(snapshot);
    let row: unknown;
    if (this.client.snapshot) {
      try {
        row = await this.client.snapshot.create({
          data: {
            userId: normalized.userId,
            entityType: normalized.entityType,
            entityId: normalized.entityId,
            snapshotType: normalized.snapshotType,
            data: normalized.data,
            checksum: normalized.checksum,
            createdAt: normalized.createdAt
          }
        });
      } catch (error) {
        if (!isMissingStalePrismaFieldError(error, "source")) throw error;
        row = await this.rawCreate(normalized);
      }
    } else {
      row = await this.rawCreate(normalized);
    }
    const record = toRecord(row) as SnapshotRecord<T> | undefined;
    if (!record) throw new Error("Failed to capture snapshot");
    return record;
  }

  capture<T>(snapshot: SnapshotInput<T>) {
    return this.captureSnapshot(snapshot);
  }

  async getSnapshot(id: string, currentUserId?: string) {
    if (this.client.snapshot) {
      const snapshot = toRecord(await this.client.snapshot.findUnique({ where: { id } }));
      if (!snapshot || (currentUserId && snapshot.userId !== currentUserId)) return undefined;
      return snapshot;
    }
    return toRecord(await this.rawFindFirst(`WHERE id = $1${currentUserId ? ' AND "userId" = $2' : ""}`, currentUserId ? [id, currentUserId] : [id]));
  }

  async listByEntity(entityType: string, entityId: string, currentUserId?: string) {
    if (this.client.snapshot) return toRecords(await this.client.snapshot.findMany({ where: { entityType, entityId, ...(currentUserId ? { userId: currentUserId } : {}) }, orderBy: { createdAt: "desc" } }));
    return toRecords(await this.rawFindMany(`WHERE "entityType" = $1 AND "entityId" = $2${currentUserId ? ' AND "userId" = $3' : ""} ORDER BY "createdAt" DESC`, currentUserId ? [entityType, entityId, currentUserId] : [entityType, entityId]));
  }

  async listBySnapshotType(snapshotType: string, currentUserId?: string) {
    if (this.client.snapshot) return toRecords(await this.client.snapshot.findMany({ where: { snapshotType, ...(currentUserId ? { userId: currentUserId } : {}) }, orderBy: { createdAt: "desc" } }));
    return toRecords(await this.rawFindMany(`WHERE "snapshotType" = $1${currentUserId ? ' AND "userId" = $2' : ""} ORDER BY "createdAt" DESC`, currentUserId ? [snapshotType, currentUserId] : [snapshotType]));
  }

  async listByUser(userId: string) {
    if (this.client.snapshot) return toRecords(await this.client.snapshot.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }));
    return toRecords(await this.rawFindMany('WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]));
  }

  async listRecent(limit: number, currentUserId?: string) {
    if (this.client.snapshot) return toRecords(await this.client.snapshot.findMany({ where: currentUserId ? { userId: currentUserId } : undefined, take: limit, orderBy: { createdAt: "desc" } }));
    return toRecords(await this.rawFindMany(`${currentUserId ? 'WHERE "userId" = $2 ' : ""}ORDER BY "createdAt" DESC LIMIT $1`, currentUserId ? [limit, currentUserId] : [limit]));
  }

  async compareSnapshots(snapshotA: SnapshotRecord | string, snapshotB: SnapshotRecord | string) {
    const left = typeof snapshotA === "string" ? await this.getSnapshot(snapshotA) : snapshotA;
    const right = typeof snapshotB === "string" ? await this.getSnapshot(snapshotB) : snapshotB;
    if (!left || !right) throw new Error("Snapshot not found for comparison");
    return compareSnapshotRecords(left, right);
  }

  private async rawFindFirst(whereClause: string, values: unknown[]) {
    const rows = await this.rawFindMany(`${whereClause} LIMIT 1`, values);
    return rows[0];
  }

  private rawFindMany(whereClause: string, values: unknown[]) {
    if (!this.client.$queryRawUnsafe) throw new Error("SNAPSHOT_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "Snapshot" ${whereClause}`, ...values);
  }

  private rawCreate(record: SnapshotRecord) {
    if (!this.client.$queryRawUnsafe) throw new Error("SNAPSHOT_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`INSERT INTO "Snapshot" (id, "userId", "entityType", "entityId", "snapshotType", data, checksum, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING *`, record.id, record.userId, record.entityType, record.entityId, record.snapshotType, JSON.stringify(record.data), record.checksum, record.createdAt).then((rows) => rows[0]);
  }
}

function isMissingStalePrismaFieldError(error: unknown, field: string) {
  return error instanceof Error && error.message.includes(`Argument \`${field}\` is missing`);
}

export const snapshotStore = new InMemorySnapshotStore();
export const prismaSnapshotStore = new PrismaSnapshotStore();

import { prisma as defaultPrisma } from "@career-os/db";

export interface StateProjectionInput<T = unknown> {
  id?: string;
  userId?: string;
  projectionType: string;
  entityType: string;
  entityId: string;
  data?: T;
  state?: T;
  sourceEventId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StateProjectionRecord<T = unknown> {
  id: string;
  userId?: string;
  projectionType: string;
  entityType: string;
  entityId: string;
  data: T;
  state: T;
  sourceEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StateStore {
  upsertProjection<T>(projection: StateProjectionInput<T>): StateProjectionRecord<T> | Promise<StateProjectionRecord<T>>;
  upsert<T>(projection: StateProjectionInput<T>): StateProjectionRecord<T> | Promise<StateProjectionRecord<T>>;
  getProjection(entityType: string, entityId: string, projectionType: string, currentUserId?: string): StateProjectionRecord | undefined | Promise<StateProjectionRecord | undefined>;
  listByEntity(entityType: string, entityId: string, currentUserId?: string): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  listByProjectionType(projectionType: string, currentUserId?: string): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  listByUser(userId: string): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  listRecent(limit: number, currentUserId?: string): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  deleteProjection(id: string): StateProjectionRecord | undefined | Promise<StateProjectionRecord | undefined>;
}

type PrismaLike = {
  stateProjection?: {
    upsert(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    delete(args: unknown): Promise<unknown>;
  };
  $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};

function createProjectionId() {
  return `projection_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function projectionData<T>(projection: StateProjectionInput<T>): T {
  return (projection.data ?? projection.state ?? {}) as T;
}

function normalizeProjection<T>(projection: StateProjectionInput<T>, id = projection.id ?? createProjectionId()): StateProjectionRecord<T> {
  const data = projectionData(projection);
  const now = new Date();
  return {
    id,
    userId: projection.userId,
    projectionType: projection.projectionType,
    entityType: projection.entityType,
    entityId: projection.entityId,
    data,
    state: data,
    sourceEventId: projection.sourceEventId,
    createdAt: projection.createdAt ?? now,
    updatedAt: projection.updatedAt ?? now
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

function toRecord(row: unknown): StateProjectionRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as StateProjectionRecord & { data?: unknown; state?: unknown };
  const data = parseJsonValue(record.data ?? record.state ?? {});
  return {
    ...record,
    data,
    state: data,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  };
}

function toRecords(rows: unknown[]): StateProjectionRecord[] {
  return rows.map(toRecord).filter((row): row is StateProjectionRecord => Boolean(row));
}

export class InMemoryStateStore implements StateStore {
  private projections = new Map<string, StateProjectionRecord>();

  upsertProjection<T>(projection: StateProjectionInput<T>) {
    const key = `${projection.projectionType}:${projection.entityType}:${projection.entityId}`;
    const existing = this.projections.get(key);
    const saved = normalizeProjection(projection, existing?.id);
    saved.createdAt = existing?.createdAt ?? saved.createdAt;
    this.projections.set(key, saved);
    return saved;
  }

  upsert<T>(projection: StateProjectionInput<T>) {
    return this.upsertProjection(projection);
  }

  getProjection(entityType: string, entityId: string, projectionType: string, currentUserId?: string) {
    const projection = this.projections.get(`${projectionType}:${entityType}:${entityId}`);
    if (!projection || (currentUserId && projection.userId !== currentUserId)) return undefined;
    return projection;
  }

  listByEntity(entityType: string, entityId: string, currentUserId?: string) {
    return [...this.projections.values()].filter((projection) => projection.entityType === entityType && projection.entityId === entityId && (!currentUserId || projection.userId === currentUserId));
  }

  listByProjectionType(projectionType: string, currentUserId?: string) {
    return [...this.projections.values()].filter((projection) => projection.projectionType === projectionType && (!currentUserId || projection.userId === currentUserId));
  }

  listByUser(userId: string) {
    return [...this.projections.values()].filter((projection) => projection.userId === userId);
  }

  listRecent(limit: number, currentUserId?: string) {
    return [...this.projections.values()].filter((projection) => !currentUserId || projection.userId === currentUserId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, limit);
  }

  deleteProjection(id: string) {
    const entry = [...this.projections.entries()].find(([, projection]) => projection.id === id);
    if (!entry) return undefined;
    this.projections.delete(entry[0]);
    return entry[1];
  }

  list() {
    return [...this.projections.values()];
  }

  clear() {
    this.projections.clear();
  }
}

export class PrismaStateStore implements StateStore {
  constructor(private readonly client: PrismaLike = defaultPrisma as unknown as PrismaLike) {}

  async upsertProjection<T>(projection: StateProjectionInput<T>) {
    const data = projectionData(projection);
    const updatedAt = projection.updatedAt ?? new Date();
    const normalized = normalizeProjection({ ...projection, data, updatedAt });
    let row: unknown;
    if (this.client.stateProjection) {
      try {
        row = await this.client.stateProjection.upsert({
          where: {
            projectionType_entityType_entityId: {
              projectionType: projection.projectionType,
              entityType: projection.entityType,
              entityId: projection.entityId
            }
          },
          create: {
            userId: projection.userId,
            projectionType: projection.projectionType,
            entityType: projection.entityType,
            entityId: projection.entityId,
            data,
            sourceEventId: projection.sourceEventId,
            createdAt: projection.createdAt,
            updatedAt
          },
          update: {
            userId: projection.userId,
            data,
            sourceEventId: projection.sourceEventId,
            updatedAt
          }
        });
      } catch (error) {
        if (!isMissingStalePrismaFieldError(error, "state")) throw error;
        row = await this.rawUpsert(normalized);
      }
    } else {
      row = await this.rawUpsert(normalized);
    }
    const record = toRecord(row) as StateProjectionRecord<T> | undefined;
    if (!record) throw new Error("Failed to upsert state projection");
    return record;
  }

  upsert<T>(projection: StateProjectionInput<T>) {
    return this.upsertProjection(projection);
  }

  async getProjection(entityType: string, entityId: string, projectionType: string, currentUserId?: string) {
    if (this.client.stateProjection) return toRecord(await this.client.stateProjection.findFirst({ where: { entityType, entityId, projectionType, ...(currentUserId ? { userId: currentUserId } : {}) } }));
    return toRecord(await this.rawFindFirst(`WHERE "entityType" = $1 AND "entityId" = $2 AND "projectionType" = $3${currentUserId ? ' AND "userId" = $4' : ""}`, currentUserId ? [entityType, entityId, projectionType, currentUserId] : [entityType, entityId, projectionType]));
  }

  async listByEntity(entityType: string, entityId: string, currentUserId?: string) {
    if (this.client.stateProjection) return toRecords(await this.client.stateProjection.findMany({ where: { entityType, entityId, ...(currentUserId ? { userId: currentUserId } : {}) }, orderBy: { updatedAt: "desc" } }));
    return toRecords(await this.rawFindMany(`WHERE "entityType" = $1 AND "entityId" = $2${currentUserId ? ' AND "userId" = $3' : ""} ORDER BY "updatedAt" DESC`, currentUserId ? [entityType, entityId, currentUserId] : [entityType, entityId]));
  }

  async listByProjectionType(projectionType: string, currentUserId?: string) {
    if (this.client.stateProjection) return toRecords(await this.client.stateProjection.findMany({ where: { projectionType, ...(currentUserId ? { userId: currentUserId } : {}) }, orderBy: { updatedAt: "desc" } }));
    return toRecords(await this.rawFindMany(`WHERE "projectionType" = $1${currentUserId ? ' AND "userId" = $2' : ""} ORDER BY "updatedAt" DESC`, currentUserId ? [projectionType, currentUserId] : [projectionType]));
  }

  async listByUser(userId: string) {
    if (this.client.stateProjection) return toRecords(await this.client.stateProjection.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }));
    return toRecords(await this.rawFindMany('WHERE "userId" = $1 ORDER BY "updatedAt" DESC', [userId]));
  }

  async listRecent(limit: number, currentUserId?: string) {
    if (this.client.stateProjection) return toRecords(await this.client.stateProjection.findMany({ where: currentUserId ? { userId: currentUserId } : undefined, take: limit, orderBy: { updatedAt: "desc" } }));
    return toRecords(await this.rawFindMany(`${currentUserId ? 'WHERE "userId" = $2 ' : ""}ORDER BY "updatedAt" DESC LIMIT $1`, currentUserId ? [limit, currentUserId] : [limit]));
  }

  async deleteProjection(id: string) {
    try {
      if (this.client.stateProjection) return toRecord(await this.client.stateProjection.delete({ where: { id } }));
      if (!this.client.$queryRawUnsafe) return undefined;
      const rows = await this.client.$queryRawUnsafe<unknown[]>('DELETE FROM "StateProjection" WHERE id = $1 RETURNING *', id);
      return toRecord(rows[0]);
    } catch {
      return undefined;
    }
  }

  private async rawFindFirst(whereClause: string, values: unknown[]) {
    const rows = await this.rawFindMany(`${whereClause} LIMIT 1`, values);
    return rows[0];
  }

  private rawFindMany(whereClause: string, values: unknown[]) {
    if (!this.client.$queryRawUnsafe) throw new Error("STATE_PROJECTION_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`SELECT * FROM "StateProjection" ${whereClause}`, ...values);
  }

  private rawUpsert(record: StateProjectionRecord) {
    if (!this.client.$queryRawUnsafe) throw new Error("STATE_PROJECTION_PRISMA_CLIENT_UNAVAILABLE: Prisma Client does not expose raw query methods. Run `npx prisma generate` and restart `npm run dev`.");
    return this.client.$queryRawUnsafe<unknown[]>(`INSERT INTO "StateProjection" (id, "userId", "projectionType", "entityType", "entityId", data, "sourceEventId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
      ON CONFLICT ("projectionType", "entityType", "entityId") DO UPDATE SET "userId" = EXCLUDED."userId", data = EXCLUDED.data, "sourceEventId" = EXCLUDED."sourceEventId", "updatedAt" = EXCLUDED."updatedAt"
      RETURNING *`, record.id, record.userId, record.projectionType, record.entityType, record.entityId, JSON.stringify(record.data), record.sourceEventId, record.createdAt, record.updatedAt).then((rows) => rows[0]);
  }
}

function isMissingStalePrismaFieldError(error: unknown, field: string) {
  return error instanceof Error && error.message.includes(`Argument \`${field}\` is missing`);
}

export const stateStore = new InMemoryStateStore();
export const prismaStateStore = new PrismaStateStore();

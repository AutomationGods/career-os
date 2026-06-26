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
  getProjection(entityType: string, entityId: string, projectionType: string): StateProjectionRecord | undefined | Promise<StateProjectionRecord | undefined>;
  listByEntity(entityType: string, entityId: string): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  listByProjectionType(projectionType: string): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  listByUser(userId: string): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  listRecent(limit: number): StateProjectionRecord[] | Promise<StateProjectionRecord[]>;
  deleteProjection(id: string): StateProjectionRecord | undefined | Promise<StateProjectionRecord | undefined>;
}

type PrismaLike = {
  stateProjection: {
    upsert(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    delete(args: unknown): Promise<unknown>;
  };
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

function toRecord(row: unknown): StateProjectionRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as StateProjectionRecord & { data?: unknown; state?: unknown };
  const data = record.data ?? record.state ?? {};
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

  getProjection(entityType: string, entityId: string, projectionType: string) {
    return this.projections.get(`${projectionType}:${entityType}:${entityId}`);
  }

  listByEntity(entityType: string, entityId: string) {
    return [...this.projections.values()].filter((projection) => projection.entityType === entityType && projection.entityId === entityId);
  }

  listByProjectionType(projectionType: string) {
    return [...this.projections.values()].filter((projection) => projection.projectionType === projectionType);
  }

  listByUser(userId: string) {
    return [...this.projections.values()].filter((projection) => projection.userId === userId);
  }

  listRecent(limit: number) {
    return [...this.projections.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, limit);
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
    const row = await this.client.stateProjection.upsert({
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
        updatedAt: projection.updatedAt
      },
      update: {
        userId: projection.userId,
        data,
        sourceEventId: projection.sourceEventId,
        updatedAt: projection.updatedAt ?? new Date()
      }
    });
    const record = toRecord(row) as StateProjectionRecord<T> | undefined;
    if (!record) throw new Error("Failed to upsert state projection");
    return record;
  }

  upsert<T>(projection: StateProjectionInput<T>) {
    return this.upsertProjection(projection);
  }

  async getProjection(entityType: string, entityId: string, projectionType: string) {
    return toRecord(await this.client.stateProjection.findFirst({ where: { entityType, entityId, projectionType } }));
  }

  async listByEntity(entityType: string, entityId: string) {
    return toRecords(await this.client.stateProjection.findMany({ where: { entityType, entityId }, orderBy: { updatedAt: "desc" } }));
  }

  async listByProjectionType(projectionType: string) {
    return toRecords(await this.client.stateProjection.findMany({ where: { projectionType }, orderBy: { updatedAt: "desc" } }));
  }

  async listByUser(userId: string) {
    return toRecords(await this.client.stateProjection.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }));
  }

  async listRecent(limit: number) {
    return toRecords(await this.client.stateProjection.findMany({ take: limit, orderBy: { updatedAt: "desc" } }));
  }

  async deleteProjection(id: string) {
    try {
      return toRecord(await this.client.stateProjection.delete({ where: { id } }));
    } catch {
      return undefined;
    }
  }
}

export const stateStore = new InMemoryStateStore();
export const prismaStateStore = new PrismaStateStore();

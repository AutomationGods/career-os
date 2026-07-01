import { describe, expect, it } from "vitest";
import { InMemoryStateStore, PrismaStateStore } from "../index";

describe("state stores", () => {
  it("creates and updates an in-memory projection", () => {
    const store = new InMemoryStateStore();
    const first = store.upsertProjection({ projectionType: "job.current_status", entityType: "job", entityId: "job-1", data: { status: "new" } });
    const second = store.upsertProjection({ projectionType: "job.current_status", entityType: "job", entityId: "job-1", data: { status: "scored" } });

    expect(second.id).toBe(first.id);
    expect((store.getProjection("job", "job-1", "job.current_status")?.data as { status: string }).status).toBe("scored");
    expect(store.listByEntity("job", "job-1").length).toBe(1);
    expect(store.listByProjectionType("job.current_status").length).toBe(1);
  });

  it("keeps same entity id separate for different users", () => {
    const store = new InMemoryStateStore();
    store.upsertProjection({ projectionType: "job.dashboard_segment", entityType: "job", entityId: "remotive:123", userId: "user-1", data: { title: "User 1 job" } });
    store.upsertProjection({ projectionType: "job.dashboard_segment", entityType: "job", entityId: "remotive:123", userId: "user-2", data: { title: "User 2 job" } });

    expect(store.listByEntity("job", "remotive:123").length).toBe(2);
    expect((store.getProjection("job", "remotive:123", "job.dashboard_segment", { userId: "user-1" })?.data as { title: string }).title).toBe("User 1 job");
    expect((store.getProjection("job", "remotive:123", "job.dashboard_segment", { userId: "user-2" })?.data as { title: string }).title).toBe("User 2 job");
    expect(store.listByProjectionType("job.dashboard_segment", { userId: "user-1" }).length).toBe(1);
  });

  it("uses a prisma client behind the state store contract", async () => {
    const rows = new Map<string, Record<string, unknown>>();
    const client = {
      stateProjection: {
        upsert: async (args: { where: { scopeKey_projectionType_entityType_entityId: { scopeKey: string; projectionType: string; entityType: string; entityId: string } }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
          const key = `${args.where.scopeKey_projectionType_entityType_entityId.scopeKey}:${args.where.scopeKey_projectionType_entityType_entityId.projectionType}:${args.where.scopeKey_projectionType_entityType_entityId.entityType}:${args.where.scopeKey_projectionType_entityType_entityId.entityId}`;
          const existing = rows.get(key);
          const row = existing ? { ...existing, ...args.update, updatedAt: new Date() } : { id: "projection-1", ...args.create, createdAt: new Date(), updatedAt: new Date() };
          rows.set(key, row);
          return row;
        },
        findFirst: async (args: { where?: Record<string, unknown> } = {}) => [...rows.values()].find((row) => Object.entries(args.where ?? {}).every(([key, value]) => row[key] === value)),
        findMany: async (args: { where?: Record<string, unknown> } = {}) => [...rows.values()].filter((row) => Object.entries(args.where ?? {}).every(([key, value]) => row[key] === value)),
        delete: async (args: { where: { id: string } }) => {
          const entry = [...rows.entries()].find(([, row]) => row.id === args.where.id);
          if (!entry) throw new Error("missing");
          rows.delete(entry[0]);
          return entry[1];
        }
      }
    };
    const store = new PrismaStateStore(client);
    const saved = await store.upsertProjection({ projectionType: "job.current_status", entityType: "job", entityId: "job-1", data: { status: "new" }, userId: "user-1" });

    expect(saved.id).toBe("projection-1");
    expect((await store.listByUser("user-1")).length).toBe(1);
    expect((await store.deleteProjection(saved.id))?.id).toBe(saved.id);
  });
});

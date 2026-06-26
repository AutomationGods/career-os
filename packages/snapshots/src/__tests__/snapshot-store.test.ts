import { describe, expect, it } from "vitest";
import { InMemorySnapshotStore, PrismaSnapshotStore } from "../index";

describe("snapshot stores", () => {
  it("captures, lists, and compares in-memory snapshots", () => {
    const store = new InMemorySnapshotStore();
    const first = store.captureSnapshot({ entityType: "job", entityId: "job-1", snapshotType: "job.description_snapshot", data: { title: "SRE", level: 1 } });
    const second = store.captureSnapshot({ entityType: "job", entityId: "job-1", snapshotType: "job.description_snapshot", data: { title: "SRE", level: 2 } });
    const diff = store.compareSnapshots(first, second);

    expect(Boolean(first.checksum)).toBe(true);
    expect(store.listByEntity("job", "job-1").length).toBe(2);
    expect(store.listBySnapshotType("job.description_snapshot").length).toBe(2);
    expect(diff.equal).toBe(false);
    expect(diff.changedTopLevelKeys.includes("level")).toBe(true);
  });

  it("uses a prisma client behind the snapshot store contract", async () => {
    const rows: unknown[] = [];
    const client = {
      snapshot: {
        create: async (args: { data: unknown }) => {
          const row = { id: `snapshot-${rows.length + 1}`, ...(args.data as object) };
          rows.push(row);
          return row;
        },
        findUnique: async (args: { where: { id: string } }) => rows.find((row) => (row as { id: string }).id === args.where.id),
        findMany: async () => rows
      }
    };
    const store = new PrismaSnapshotStore(client);
    const saved = await store.captureSnapshot({ entityType: "job", entityId: "job-1", snapshotType: "job.description_snapshot", data: { title: "SRE" } });

    expect(saved.id).toBe("snapshot-1");
    expect((await store.getSnapshot(saved.id))?.id).toBe(saved.id);
    expect((await store.listByEntity("job", "job-1")).length).toBe(1);
  });
});

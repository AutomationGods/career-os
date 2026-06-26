import { describe, expect, it } from "vitest";
import { InMemoryEventStore, PrismaEventStore, type CareerEventInput } from "../index";

const event = (overrides: Partial<CareerEventInput> = {}): CareerEventInput => ({
  eventType: "job.normalized",
  entityType: "job",
  entityId: "job-1",
  domain: "job-intelligence",
  payload: { title: "SRE" },
  ...overrides
});

describe("event stores", () => {
  it("appends and queries in-memory events", () => {
    const store = new InMemoryEventStore();
    const saved = store.append(event());
    store.appendMany([event({ eventType: "job.scored" }), event({ entityId: "job-2" })]);

    expect(Boolean(saved.id)).toBe(true);
    expect(store.listByEntity("job", "job-1").length).toBe(2);
    expect(store.listByType("job.scored").length).toBe(1);
    expect(store.listRecent(2).length).toBe(2);
  });

  it("uses a prisma client behind the event store contract", async () => {
    const rows: unknown[] = [];
    const client = {
      event: {
        create: async (args: { data: unknown }) => {
          const row = { id: `event-${rows.length + 1}`, ...(args.data as object) };
          rows.push(row);
          return row;
        },
        createMany: async () => ({}),
        findUnique: async (args: { where: { id: string } }) => rows.find((row) => (row as { id: string }).id === args.where.id),
        findMany: async (args: { where?: Record<string, string>; take?: number }) => rows.filter((row) => {
          const where = args.where ?? {};
          return Object.entries(where).every(([key, value]) => (row as Record<string, string>)[key] === value);
        }).slice(0, args.take)
      }
    };
    const store = new PrismaEventStore(client);
    const saved = await store.append(event({ userId: "user-1" }));

    expect(saved.payload !== undefined).toBe(true);
    expect((await store.getById(saved.id))?.id).toBe(saved.id);
    expect((await store.listByUser("user-1")).length).toBe(1);
  });
});

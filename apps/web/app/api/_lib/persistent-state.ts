import { prisma } from "@career-os/db";
import { listApplicationPackets, listRelationshipPeople, type ApplicationPacketRecord, type RelationshipPerson } from "@career-os/domains";
import { eventStore, prismaEventStore, type CareerEventRecord } from "@career-os/events";
import { snapshotStore } from "@career-os/snapshots";
import { prismaStateStore, stateStore, type StateProjectionRecord } from "@career-os/state";

export type JobDashboardProjection = StateProjectionRecord<Record<string, unknown>>;
export type ResumeDraftProjection = StateProjectionRecord<Record<string, unknown>>;

export interface PersistentRuntimeCounts {
  events: number;
  stateProjections: number;
  snapshots: number;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isApplicationPacketRecord(value: unknown): value is ApplicationPacketRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.jobId === "string" &&
    isRecord(value.selectedJob) &&
    isRecord(value.fitScoreSummary) &&
    isStringArray(value.notes) &&
    typeof value.status === "string"
  );
}

function isRelationshipPerson(value: unknown): value is RelationshipPerson {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.normalizedName === "string" &&
    isStringArray(value.emails) &&
    isStringArray(value.phones) &&
    isStringArray(value.roles)
  );
}

function useLocalMemoryRuntime() {
  return process.env.CAREER_OS_COMMAND_RUNTIME === "local-memory";
}

function isUserScoped<T>(record: { userId?: string | null }, userId: string) {
  return record.userId === userId;
}

function userScopedOrLocalFallback<T extends { userId?: string | null }>(records: T[], userId: string) {
  const userScoped = records.filter((record) => isUserScoped(record, userId));
  return userScoped.length > 0 || !useLocalMemoryRuntime() ? userScoped : records;
}

async function listStateProjections(projectionType: string, userId: string) {
  const store = useLocalMemoryRuntime() ? stateStore : prismaStateStore;
  const projections = await Promise.resolve(store.listByProjectionType(projectionType, { userId }));
  if (projections.length > 0 || !useLocalMemoryRuntime()) return projections;
  return userScopedOrLocalFallback(await Promise.resolve(store.listByProjectionType(projectionType)), userId);
}

export async function listPersistentApplicationPackets(userId: string) {
  const projections = await listStateProjections("application_packet.current", userId);
  const packets = projections.map((projection) => projection.data).filter(isApplicationPacketRecord);
  if (packets.length > 0 || !useLocalMemoryRuntime()) return packets;
  return listApplicationPackets();
}

export async function getPersistentApplicationPacket(userId: string, id: string) {
  const packets = await listPersistentApplicationPackets(userId);
  return packets.find((packet) => packet.id === id);
}

export async function listPersistentRelationshipPeople(userId: string) {
  const projections = await listStateProjections("relationship.person", userId);
  const people = projections.map((projection) => projection.data).filter(isRelationshipPerson);
  if (people.length > 0 || !useLocalMemoryRuntime()) return people;
  return listRelationshipPeople();
}

export async function getPersistentRelationshipPerson(userId: string, id: string) {
  const people = await listPersistentRelationshipPeople(userId);
  return people.find((person) => person.id === id);
}

export async function listPersistentJobDashboardProjections(userId: string): Promise<JobDashboardProjection[]> {
  const projections = await listStateProjections("job.dashboard_segment", userId);
  return projections.map((projection) => {
    const data = isRecord(projection.data) ? projection.data : {};
    return { ...projection, data, state: data };
  });
}

export async function listPersistentResumeDraftProjections(userId: string): Promise<ResumeDraftProjection[]> {
  const projections = await listStateProjections("resume.current_draft", userId);
  return projections.map((projection) => {
    const data = isRecord(projection.data) ? projection.data : {};
    return { ...projection, data, state: data };
  });
}

export async function listPersistentEntityProjections(userId: string, entityType: string, entityId: string) {
  const store = useLocalMemoryRuntime() ? stateStore : prismaStateStore;
  const projections = await Promise.resolve(store.listByEntity(entityType, entityId, { userId }));
  if (projections.length > 0 || !useLocalMemoryRuntime()) return projections;
  return userScopedOrLocalFallback(await Promise.resolve(store.listByEntity(entityType, entityId)), userId);
}

export async function listPersistentEntityEvents(userId: string, entityType: string, entityId: string): Promise<CareerEventRecord[]> {
  const store = useLocalMemoryRuntime() ? eventStore : prismaEventStore;
  const events = await Promise.resolve(store.listByEntity(entityType, entityId));
  return userScopedOrLocalFallback(events, userId);
}

export async function getPersistentRuntimeCounts(userId: string): Promise<PersistentRuntimeCounts> {
  if (useLocalMemoryRuntime()) {
    const events = userScopedOrLocalFallback(eventStore.list(), userId);
    const stateProjections = userScopedOrLocalFallback(stateStore.list(), userId);
    const snapshots = userScopedOrLocalFallback(snapshotStore.list(), userId);
    return { events: events.length, stateProjections: stateProjections.length, snapshots: snapshots.length };
  }

  const [events, stateProjections, snapshots] = await Promise.all([
    prisma.event.count({ where: { userId } }),
    prisma.stateProjection.count({ where: { userId } }),
    prisma.snapshot.count({ where: { userId } })
  ]);

  return { events, stateProjections, snapshots };
}

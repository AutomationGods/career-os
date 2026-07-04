import { prismaStateStore, stateStore, type StateStore } from "@career-os/state";
import { isPersistentStoreUnavailable, isLocalReadRequest, shouldUseLocalMemoryStoreReads } from "../../_lib/store-read-runtime";

const projectionTypesToClear = [
  "career_claim.current",
  "profile_facts.current",
  "career_opportunities.current_pipeline",
  "application_packet.current",
  "resume.current_draft"
];

async function deleteIfFound(store: StateStore, projection: { id: string } | undefined) {
  if (!projection) return 0;
  await store.deleteProjection(projection.id);
  return 1;
}

export async function resetCareerCommandStateForUser(userId: string, store: StateStore) {
  let deletedCount = 0;
  const userScope = { userId };

  const sourceDocuments = await store.getProjection("source_documents", userId, "source_documents.current", userScope);
  deletedCount += await deleteIfFound(store, sourceDocuments);

  const careerProfile = await store.getProjection("career_profile", userId, "career_profile.current", userScope);
  deletedCount += await deleteIfFound(store, careerProfile);

  const dailyMission = await store.getProjection("daily_mission", "today", "daily_mission.current_queue", userScope);
  deletedCount += await deleteIfFound(store, dailyMission);

  for (const projectionType of projectionTypesToClear) {
    const projections = await store.listByProjectionType(projectionType, userScope);
    for (const projection of projections) {
      await store.deleteProjection(projection.id);
      deletedCount += 1;
    }
  }

  return { deletedCount };
}

export async function resetCareerCommandStateWithFallback(request: Request, userId: string) {
  if (shouldUseLocalMemoryStoreReads()) return resetCareerCommandStateForUser(userId, stateStore);

  try {
    return await resetCareerCommandStateForUser(userId, prismaStateStore);
  } catch (error) {
    if (isPersistentStoreUnavailable(error) && isLocalReadRequest(request)) return resetCareerCommandStateForUser(userId, stateStore);
    throw error;
  }
}

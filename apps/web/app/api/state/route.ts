import { prismaStateStore } from "@career-os/state";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../_lib/store-read-runtime";

export async function GET(request: Request) {
  let query: ReturnType<typeof listQuerySchema.parse>;
  try {
    query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  } catch (error) {
    return fail(errorMessage(error), "STATE_QUERY_FAILED", 400);
  }

  try {
    const projections = await readWithLocalFallback(request, () => {
      if (query.userId) return prismaStateStore.listByUser(query.userId);
      if (query.projectionType) return prismaStateStore.listByProjectionType(query.projectionType);
      return prismaStateStore.listRecent(query.limit);
    }, () => {
      if (query.userId) return localReadStores.state.listByUser(query.userId);
      if (query.projectionType) return localReadStores.state.listByProjectionType(query.projectionType);
      return localReadStores.state.listRecent(query.limit);
    }, "Persistent state store is unavailable.");
    return ok(projections);
  } catch (error) {
    return storeReadFailure(error, "STATE_QUERY_FAILED");
  }
}

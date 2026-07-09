import { prismaStateStore } from "@career-os/state";
import { errorMessage, fail, listQuerySchema, ok, paginated } from "../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../_lib/store-read-runtime";

export async function GET(request: Request) {
  let query: ReturnType<typeof listQuerySchema.parse>;
  try {
    query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  } catch (error) {
    return fail(errorMessage(error), "STATE_QUERY_FAILED", 400);
  }

  try {
    const allProjections = await readWithLocalFallback(request, () => {
      if (query.userId) return prismaStateStore.listByUser(query.userId);
      if (query.projectionType) return prismaStateStore.listByProjectionType(query.projectionType);
      return prismaStateStore.listRecent(query.limit + 1);
    }, () => {
      if (query.userId) return localReadStores.state.listByUser(query.userId);
      if (query.projectionType) return localReadStores.state.listByProjectionType(query.projectionType);
      return localReadStores.state.listRecent(query.limit + 1);
    }, "Persistent state store is unavailable.");

    // If cursor provided, find the starting point
    let projections = allProjections;
    if (query.cursor) {
      const cursorIndex = projections.findIndex((p) => p.id === query.cursor);
      if (cursorIndex >= 0) projections = projections.slice(cursorIndex + 1);
    }

    return ok(paginated(projections, query.limit));
  } catch (error) {
    return storeReadFailure(error, "STATE_QUERY_FAILED");
  }
}

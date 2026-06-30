import { prismaSnapshotStore } from "@career-os/snapshots";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../_lib/store-read-runtime";

export async function GET(request: Request) {
  let query: ReturnType<typeof listQuerySchema.parse>;
  try {
    query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  } catch (error) {
    return fail(errorMessage(error), "SNAPSHOTS_QUERY_FAILED", 400);
  }

  try {
    const snapshots = await readWithLocalFallback(request, () => {
      if (query.snapshotType) return prismaSnapshotStore.listBySnapshotType(query.snapshotType);
      return prismaSnapshotStore.listRecent(query.limit);
    }, () => {
      if (query.snapshotType) return localReadStores.snapshots.listBySnapshotType(query.snapshotType);
      return localReadStores.snapshots.listRecent(query.limit);
    }, "Persistent snapshot store is unavailable.");
    return ok(snapshots);
  } catch (error) {
    return storeReadFailure(error, "SNAPSHOTS_QUERY_FAILED");
  }
}

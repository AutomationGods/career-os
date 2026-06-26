import { prismaSnapshotStore } from "@career-os/snapshots";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (query.snapshotType) return ok(await prismaSnapshotStore.listBySnapshotType(query.snapshotType));
    return ok(await prismaSnapshotStore.listRecent(query.limit));
  } catch (error) {
    return fail(errorMessage(error), "SNAPSHOTS_QUERY_FAILED", 400);
  }
}

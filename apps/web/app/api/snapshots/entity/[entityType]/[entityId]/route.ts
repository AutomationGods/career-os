import { prismaSnapshotStore } from "@career-os/snapshots";
import { ok } from "../../../../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../../../../_lib/store-read-runtime";

export async function GET(request: Request, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    const snapshots = await readWithLocalFallback(request, () => prismaSnapshotStore.listByEntity(params.entityType, params.entityId), () => localReadStores.snapshots.listByEntity(params.entityType, params.entityId), "Persistent snapshot store is unavailable.");
    return ok(snapshots);
  } catch (error) {
    return storeReadFailure(error, "SNAPSHOT_ENTITY_LOOKUP_FAILED");
  }
}

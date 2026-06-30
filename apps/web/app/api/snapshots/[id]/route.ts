import { prismaSnapshotStore } from "@career-os/snapshots";
import { fail, ok } from "../../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../../_lib/store-read-runtime";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const snapshot = await readWithLocalFallback(request, () => prismaSnapshotStore.getSnapshot(params.id), () => localReadStores.snapshots.getSnapshot(params.id), "Persistent snapshot store is unavailable.");
    return snapshot ? ok(snapshot) : fail("Snapshot not found", "SNAPSHOT_NOT_FOUND", 404);
  } catch (error) {
    return storeReadFailure(error, "SNAPSHOT_LOOKUP_FAILED");
  }
}

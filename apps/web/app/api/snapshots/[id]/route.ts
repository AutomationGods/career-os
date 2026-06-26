import { prismaSnapshotStore } from "@career-os/snapshots";
import { errorMessage, fail, ok } from "../../_lib/responses";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const snapshot = await prismaSnapshotStore.getSnapshot(params.id);
    return snapshot ? ok(snapshot) : fail("Snapshot not found", "SNAPSHOT_NOT_FOUND", 404);
  } catch (error) {
    return fail(errorMessage(error), "SNAPSHOT_LOOKUP_FAILED", 500);
  }
}

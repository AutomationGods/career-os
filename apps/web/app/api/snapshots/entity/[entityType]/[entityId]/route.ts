import { prismaSnapshotStore } from "@career-os/snapshots";
import { errorMessage, fail, ok } from "../../../../_lib/responses";

export async function GET(_request: Request, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    return ok(await prismaSnapshotStore.listByEntity(params.entityType, params.entityId));
  } catch (error) {
    return fail(errorMessage(error), "SNAPSHOT_ENTITY_LOOKUP_FAILED", 500);
  }
}

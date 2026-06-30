import { prismaStateStore } from "@career-os/state";
import { ok } from "../../../../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../../../../_lib/store-read-runtime";

export async function GET(request: Request, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    const projections = await readWithLocalFallback(request, () => prismaStateStore.listByEntity(params.entityType, params.entityId), () => localReadStores.state.listByEntity(params.entityType, params.entityId), "Persistent state store is unavailable.");
    return ok(projections);
  } catch (error) {
    return storeReadFailure(error, "STATE_ENTITY_LOOKUP_FAILED");
  }
}

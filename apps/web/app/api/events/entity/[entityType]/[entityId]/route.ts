import { prismaEventStore } from "@career-os/events";
import { ok } from "../../../../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../../../../_lib/store-read-runtime";

export async function GET(request: Request, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    const events = await readWithLocalFallback(request, () => prismaEventStore.listByEntity(params.entityType, params.entityId), () => localReadStores.events.listByEntity(params.entityType, params.entityId), "Persistent event store is unavailable.");
    return ok(events);
  } catch (error) {
    return storeReadFailure(error, "EVENT_ENTITY_LOOKUP_FAILED");
  }
}

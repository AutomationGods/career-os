import { prismaEventStore } from "@career-os/events";
import { fail, ok } from "../../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../../_lib/store-read-runtime";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const event = await readWithLocalFallback(request, () => prismaEventStore.getById(params.id), () => localReadStores.events.getById(params.id), "Persistent event store is unavailable.");
    return event ? ok(event) : fail("Event not found", "EVENT_NOT_FOUND", 404);
  } catch (error) {
    return storeReadFailure(error, "EVENT_LOOKUP_FAILED");
  }
}

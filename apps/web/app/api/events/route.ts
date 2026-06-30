import { prismaEventStore } from "@career-os/events";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../_lib/store-read-runtime";

export async function GET(request: Request) {
  let query: ReturnType<typeof listQuerySchema.parse>;
  try {
    query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  } catch (error) {
    return fail(errorMessage(error), "EVENTS_QUERY_FAILED", 400);
  }

  try {
    const events = await readWithLocalFallback(request, () => {
      if (query.userId) return prismaEventStore.listByUser(query.userId);
      if (query.eventType) return prismaEventStore.listByType(query.eventType);
      if (query.domain) return prismaEventStore.listByDomain(query.domain);
      return prismaEventStore.listRecent(query.limit);
    }, () => {
      if (query.userId) return localReadStores.events.listByUser(query.userId);
      if (query.eventType) return localReadStores.events.listByType(query.eventType);
      if (query.domain) return localReadStores.events.listByDomain(query.domain);
      return localReadStores.events.listRecent(query.limit);
    }, "Persistent event store is unavailable.");
    return ok(events);
  } catch (error) {
    return storeReadFailure(error, "EVENTS_QUERY_FAILED");
  }
}

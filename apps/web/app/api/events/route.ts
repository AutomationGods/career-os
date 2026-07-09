import { prismaEventStore } from "@career-os/events";
import { errorMessage, fail, listQuerySchema, ok, paginated } from "../_lib/responses";
import { localReadStores, readWithLocalFallback, storeReadFailure } from "../_lib/store-read-runtime";

export async function GET(request: Request) {
  let query: ReturnType<typeof listQuerySchema.parse>;
  try {
    query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  } catch (error) {
    return fail(errorMessage(error), "EVENTS_QUERY_FAILED", 400);
  }

  try {
    const allEvents = await readWithLocalFallback(request, () => {
      if (query.userId) return prismaEventStore.listByUser(query.userId);
      if (query.eventType) return prismaEventStore.listByType(query.eventType);
      if (query.domain) return prismaEventStore.listByDomain(query.domain);
      return prismaEventStore.listRecent(query.limit + 1);
    }, () => {
      if (query.userId) return localReadStores.events.listByUser(query.userId);
      if (query.eventType) return localReadStores.events.listByType(query.eventType);
      if (query.domain) return localReadStores.events.listByDomain(query.domain);
      return localReadStores.events.listRecent(query.limit + 1);
    }, "Persistent event store is unavailable.");

    // If cursor provided, find the starting point
    let events = allEvents;
    if (query.cursor) {
      const cursorIndex = events.findIndex((e) => e.id === query.cursor);
      if (cursorIndex >= 0) events = events.slice(cursorIndex + 1);
    }

    return ok(paginated(events, query.limit));
  } catch (error) {
    return storeReadFailure(error, "EVENTS_QUERY_FAILED");
  }
}

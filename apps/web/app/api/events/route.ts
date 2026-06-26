import { prismaEventStore } from "@career-os/events";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (query.userId) return ok(await prismaEventStore.listByUser(query.userId));
    if (query.eventType) return ok(await prismaEventStore.listByType(query.eventType));
    if (query.domain) return ok(await prismaEventStore.listByDomain(query.domain));
    return ok(await prismaEventStore.listRecent(query.limit));
  } catch (error) {
    return fail(errorMessage(error), "EVENTS_QUERY_FAILED", 400);
  }
}

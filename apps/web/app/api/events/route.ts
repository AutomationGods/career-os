import { prismaEventStore, type CareerEventRecord } from "@career-os/events";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";
import { requireUser, sessionErrorResponse, type AuthenticatedUser } from "../_lib/session";

function scopeEvents(user: AuthenticatedUser, events: CareerEventRecord[]) {
  return user.role === "admin" ? events : events.filter((event) => event.userId === user.id);
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const scopeUserId = user.role === "admin" ? undefined : user.id;
    if (query.userId && user.role === "admin") return ok(await prismaEventStore.listByUser(query.userId));
    if (query.eventType) return ok(scopeEvents(user, await prismaEventStore.listByType(query.eventType, scopeUserId)));
    if (query.domain) return ok(scopeEvents(user, await prismaEventStore.listByDomain(query.domain, scopeUserId)));
    return ok(user.role === "admin" ? await prismaEventStore.listRecent(query.limit) : await prismaEventStore.listByUser(user.id));
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "EVENTS_QUERY_FAILED", 400);
    }
  }
}

import { prismaStateStore, type StateProjectionRecord } from "@career-os/state";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";
import { requireUser, sessionErrorResponse, type AuthenticatedUser } from "../_lib/session";

function scopeProjections(user: AuthenticatedUser, projections: StateProjectionRecord[]) {
  return user.role === "admin" ? projections : projections.filter((projection) => projection.userId === user.id);
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const scopeUserId = user.role === "admin" ? undefined : user.id;
    if (query.userId && user.role === "admin") return ok(await prismaStateStore.listByUser(query.userId));
    if (query.projectionType) return ok(scopeProjections(user, await prismaStateStore.listByProjectionType(query.projectionType, scopeUserId)));
    return ok(user.role === "admin" ? await prismaStateStore.listRecent(query.limit) : await prismaStateStore.listByUser(user.id));
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "STATE_QUERY_FAILED", 400);
    }
  }
}

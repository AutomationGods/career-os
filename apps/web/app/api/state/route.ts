import { prismaStateStore } from "@career-os/state";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    if (query.userId) return ok(await prismaStateStore.listByUser(query.userId));
    if (query.projectionType) return ok(await prismaStateStore.listByProjectionType(query.projectionType));
    return ok(await prismaStateStore.listRecent(query.limit));
  } catch (error) {
    return fail(errorMessage(error), "STATE_QUERY_FAILED", 400);
  }
}

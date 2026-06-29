import { prismaEventStore } from "@career-os/events";
import { errorMessage, fail, ok } from "../../../../_lib/responses";
import { requireUser, sessionErrorResponse } from "../../../../_lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  try {
    const user = await requireUser(request);
    const events = await prismaEventStore.listByEntity((await params).entityType, (await params).entityId, user.role === "admin" ? undefined : user.id);
    return ok(events);
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "EVENT_ENTITY_LOOKUP_FAILED", 500);
    }
  }
}

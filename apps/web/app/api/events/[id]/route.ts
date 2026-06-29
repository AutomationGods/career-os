import { prismaEventStore } from "@career-os/events";
import { errorMessage, fail, ok } from "../../_lib/responses";
import { requireUser, sessionErrorResponse } from "../../_lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const event = await prismaEventStore.getById((await params).id, user.role === "admin" ? undefined : user.id);
    if (!event) return fail("Event not found", "EVENT_NOT_FOUND", 404);
    return ok(event);
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "EVENT_LOOKUP_FAILED", 500);
    }
  }
}

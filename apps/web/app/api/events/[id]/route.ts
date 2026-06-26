import { prismaEventStore } from "@career-os/events";
import { errorMessage, fail, ok } from "../../_lib/responses";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const event = await prismaEventStore.getById(params.id);
    return event ? ok(event) : fail("Event not found", "EVENT_NOT_FOUND", 404);
  } catch (error) {
    return fail(errorMessage(error), "EVENT_LOOKUP_FAILED", 500);
  }
}

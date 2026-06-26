import { prismaEventStore } from "@career-os/events";
import { errorMessage, fail, ok } from "../../../../_lib/responses";

export async function GET(_request: Request, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    return ok(await prismaEventStore.listByEntity(params.entityType, params.entityId));
  } catch (error) {
    return fail(errorMessage(error), "EVENT_ENTITY_LOOKUP_FAILED", 500);
  }
}

import { prismaStateStore } from "@career-os/state";
import { errorMessage, fail, ok } from "../../../../_lib/responses";

export async function GET(_request: Request, { params }: { params: { entityType: string; entityId: string } }) {
  try {
    return ok(await prismaStateStore.listByEntity(params.entityType, params.entityId));
  } catch (error) {
    return fail(errorMessage(error), "STATE_ENTITY_LOOKUP_FAILED", 500);
  }
}

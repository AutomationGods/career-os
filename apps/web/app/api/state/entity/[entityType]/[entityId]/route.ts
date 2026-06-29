import { prismaStateStore } from "@career-os/state";
import { errorMessage, fail, ok } from "../../../../_lib/responses";
import { requireUser, sessionErrorResponse } from "../../../../_lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  try {
    const user = await requireUser(request);
    const projections = await prismaStateStore.listByEntity((await params).entityType, (await params).entityId, user.role === "admin" ? undefined : user.id);
    return ok(projections);
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "STATE_ENTITY_LOOKUP_FAILED", 500);
    }
  }
}

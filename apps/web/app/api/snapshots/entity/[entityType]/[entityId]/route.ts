import { prismaSnapshotStore } from "@career-os/snapshots";
import { errorMessage, fail, ok } from "../../../../_lib/responses";
import { requireUser, sessionErrorResponse } from "../../../../_lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ entityType: string; entityId: string }> }) {
  try {
    const user = await requireUser(request);
    const snapshots = await prismaSnapshotStore.listByEntity((await params).entityType, (await params).entityId, user.role === "admin" ? undefined : user.id);
    return ok(snapshots);
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "SNAPSHOT_ENTITY_LOOKUP_FAILED", 500);
    }
  }
}

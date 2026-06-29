import { prismaSnapshotStore } from "@career-os/snapshots";
import { errorMessage, fail, ok } from "../../_lib/responses";
import { requireUser, sessionErrorResponse } from "../../_lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const snapshot = await prismaSnapshotStore.getSnapshot((await params).id, user.role === "admin" ? undefined : user.id);
    if (!snapshot) return fail("Snapshot not found", "SNAPSHOT_NOT_FOUND", 404);
    return ok(snapshot);
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "SNAPSHOT_LOOKUP_FAILED", 500);
    }
  }
}

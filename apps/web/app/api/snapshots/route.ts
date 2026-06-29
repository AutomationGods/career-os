import { prismaSnapshotStore, type SnapshotRecord } from "@career-os/snapshots";
import { errorMessage, fail, listQuerySchema, ok } from "../_lib/responses";
import { requireUser, sessionErrorResponse, type AuthenticatedUser } from "../_lib/session";

function scopeSnapshots(user: AuthenticatedUser, snapshots: SnapshotRecord[]) {
  return user.role === "admin" ? snapshots : snapshots.filter((snapshot) => snapshot.userId === user.id);
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const scopeUserId = user.role === "admin" ? undefined : user.id;
    if (query.snapshotType) return ok(scopeSnapshots(user, await prismaSnapshotStore.listBySnapshotType(query.snapshotType, scopeUserId)));
    return ok(user.role === "admin" ? await prismaSnapshotStore.listRecent(query.limit) : await prismaSnapshotStore.listByUser(user.id));
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail(errorMessage(error), "SNAPSHOTS_QUERY_FAILED", 400);
    }
  }
}

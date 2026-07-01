import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { executeCommandForReview } from "../../../_lib/command-runtime";
import { commandResult, fail } from "../../../_lib/responses";

const allowedStatuses = new Set(["awaiting_review", "ready_to_apply", "followup_due", "closed"]);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined;

  if (!allowedStatuses.has(status)) {
    return fail("Invalid application packet status.", "INVALID_PACKET_STATUS", 400);
  }

  const command = createCommand({
    type: "application_packets.update_status",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "application_packet",
    entityId: params.id,
    payload: { id: params.id, status, note }
  });

  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

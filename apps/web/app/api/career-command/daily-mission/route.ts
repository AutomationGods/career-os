import { createCommand, enqueueCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult } from "../../_lib/responses";

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const command = createCommand({
    type: "daily_mission.generate",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "daily_mission",
    entityId: "today",
    payload: {},
  });

  // In local-memory mode (tests/dev), run synchronously for backward compat
  if (process.env.CAREER_OS_COMMAND_RUNTIME === "local-memory") {
    const { result } = await executeCommandForReview(request, command);
    return commandResult(result, 200, 400);
  }

  const result = await enqueueCommand(command);
  return Response.json({ ok: true, data: result }, { status: 202 });
}

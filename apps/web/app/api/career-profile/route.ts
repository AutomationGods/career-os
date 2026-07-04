import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { executeCommandForReview } from "../_lib/command-runtime";
import { commandResult } from "../_lib/responses";

export async function GET(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const command = createCommand({
    type: "career_profile.get",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "career_profile",
    entityId: authUser.userId,
    payload: {}
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

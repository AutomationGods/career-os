import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult } from "../../_lib/responses";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const command = createCommand({
    type: "system.runtime_audit",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "runtime",
    entityId: "latest",
    payload: {}
  });

  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 201, 400);
}

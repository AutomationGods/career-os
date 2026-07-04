import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({ workspaceId: z.string().default("default") });

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid career job ranking request.", "INVALID_CAREER_JOB_RANKING_REQUEST", 400);
  const command = createCommand({ type: "career_opportunities.rank", requestedBy: "api", userId: authUser.userId, entityType: "career_opportunities", entityId: authUser.userId, payload: parsed.data });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

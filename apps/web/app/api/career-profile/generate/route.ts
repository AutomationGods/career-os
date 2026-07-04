import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({ workspaceId: z.string().default("default") });

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid career profile generation request.", "INVALID_CAREER_PROFILE_REQUEST", 400);
  const command = createCommand({
    type: "career_profile.generate",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "career_profile",
    entityId: authUser.userId,
    payload: parsed.data
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

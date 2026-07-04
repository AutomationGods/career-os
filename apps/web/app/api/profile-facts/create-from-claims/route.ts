import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({ sourceDocumentId: z.string().optional(), workspaceId: z.string().default("default") });

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid profile facts from claims request.", "INVALID_PROFILE_FACTS_FROM_CLAIMS_REQUEST", 400);
  const command = createCommand({
    type: "profile_facts.create_from_claims",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "profile_facts",
    entityId: authUser.userId,
    payload: parsed.data
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

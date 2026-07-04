import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
  source: z.enum(["remotive"]).default("remotive"),
  workspaceId: z.string().default("default")
});

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid career job discovery request.", "INVALID_CAREER_JOB_DISCOVERY_REQUEST", 400);
  const command = createCommand({ type: "career_opportunities.find_jobs", requestedBy: "api", userId: authUser.userId, entityType: "career_opportunities", entityId: authUser.userId, payload: parsed.data });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

import { createCommand, enqueueCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { checkRateLimit, getRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
  source: z.enum(["remotive"]).default("remotive"),
  workspaceId: z.string().default("default"),
});

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();

  const config = getRateLimit("career-command/find-jobs");
  const rateLimit = checkRateLimit(`find-jobs:${authUser.userId}`, config);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterMs);

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return fail(
      "Invalid career job discovery request.",
      "INVALID_CAREER_JOB_DISCOVERY_REQUEST",
      400,
    );

  const command = createCommand({
    type: "career_opportunities.find_jobs",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "career_opportunities",
    entityId: authUser.userId,
    payload: parsed.data,
  });

  // In local-memory mode (tests/dev), run synchronously for backward compat
  if (process.env.CAREER_OS_COMMAND_RUNTIME === "local-memory") {
    const { result } = await executeCommandForReview(request, command);
    return commandResult(result, 200, 400);
  }

  const result = await enqueueCommand(command);
  return Response.json({ ok: true, data: result }, { status: 202 });
}

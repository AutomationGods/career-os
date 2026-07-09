import { createCommand, enqueueCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { executeCommandForReview } from "../_lib/command-runtime";
import { checkRateLimit, getRateLimit, rateLimitResponse } from "../_lib/rate-limit";
import { commandResult, fail } from "../_lib/responses";
import { resumeGenerateRequestSchema } from "./schema";

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();

  const config = getRateLimit("resumes");
  const rateLimit = checkRateLimit(`resumes:${authUser.userId}`, config);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterMs);

  const parsed = resumeGenerateRequestSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return fail("Invalid resume generation request.", "INVALID_RESUME_REQUEST", 400);
  }

  const { userId: _ignoredUserId, ...payload } = parsed.data;
  const command = createCommand({
    type: "resume.generate",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "application_packet",
    entityId: payload.applicationPacketId,
    payload,
  });

  // In local-memory mode (tests/dev), run synchronously for backward compat
  if (process.env.CAREER_OS_COMMAND_RUNTIME === "local-memory") {
    const { result } = await executeCommandForReview(request, command);
    return commandResult(result, 201, 400);
  }

  const result = await enqueueCommand(command);
  return Response.json({ ok: true, data: result }, { status: 202 });
}

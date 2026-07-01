import { DEFAULT_JOB_DISCOVERY_QUERY, clampRemotiveLimit } from "@career-os/domains";
import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const jobDiscoverySearchSchema = z.object({
  userId: z.string().min(1).optional(),
  query: z.preprocess((value) => (typeof value === "string" && value.trim() ? value.trim() : undefined), z.string().default(DEFAULT_JOB_DISCOVERY_QUERY)),
  limit: z.preprocess((value) => clampRemotiveLimit(value), z.number().int().positive().max(50)),
  source: z.enum(["all", "remotive", "remoteok", "arbeitnow"]).default("all")
});

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = jobDiscoverySearchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid job discovery search request.", "INVALID_JOB_DISCOVERY_REQUEST", 400);
  }

  const { userId: _ignoredUserId, ...payload } = parsed.data;
  const command = createCommand({
    type: "job_discovery.search",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "job_discovery_run",
    entityId: `job_discovery_run_${Date.now()}`,
    payload
  });

  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 201, 400);
}

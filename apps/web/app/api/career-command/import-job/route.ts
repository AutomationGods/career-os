import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({
  workspaceId: z.string().default("default"),
  title: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  applyUrl: z.string().optional(),
  location: z.string().optional(),
  remoteStatus: z.enum(["remote", "hybrid", "onsite", "unknown"]).default("unknown"),
  employmentType: z.string().optional(),
  salaryText: z.string().optional(),
  jobDescription: z.string().optional(),
  bulkText: z.string().optional()
}).refine((value) => Boolean(value.bulkText?.trim() || value.jobDescription?.trim() || value.title?.trim()), { message: "Paste a job title/description or bulk job text." });

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid manual job import request.", "INVALID_MANUAL_JOB_IMPORT_REQUEST", 400);
  const command = createCommand({ type: "career_opportunities.create_from_job_input", requestedBy: "api", userId: authUser.userId, entityType: "career_opportunities", entityId: authUser.userId, payload: parsed.data });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

import { getJobStatus } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { fail } from "../../../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  try {
    await requireAuthenticatedCareerUser();
    const { jobId } = params;
    if (!jobId) return fail("jobId is required.", "JOB_ID_REQUIRED", 400);

    const status = await getJobStatus(jobId);
    return Response.json({ ok: true, data: status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get job status.";
    return fail(message, "JOB_STATUS_FAILED", 500);
  }
}

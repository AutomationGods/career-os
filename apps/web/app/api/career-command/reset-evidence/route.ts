import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { fail, ok } from "../../_lib/responses";
import { resetCareerCommandStateWithFallback } from "../_lib/state-reset";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await requireAuthenticatedCareerUser();
    const result = await resetCareerCommandStateWithFallback(request, authUser.userId);
    return ok(result);
  } catch {
    return fail("Unable to reset Career Command state.", "CAREER_COMMAND_RESET_EVIDENCE_FAILED", 500);
  }
}

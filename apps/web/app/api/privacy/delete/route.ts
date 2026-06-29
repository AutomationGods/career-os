import { PRIVACY_DELETE_CONFIRMATION, privacyService } from "@career-os/domains";
import { z } from "zod";
import { fail, ok } from "../../_lib/responses";
import { requireMutationUser, sessionErrorResponse } from "../../_lib/session";

export const dynamic = "force-dynamic";

const deletionRequestSchema = z.object({
  confirm: z.literal(PRIVACY_DELETE_CONFIRMATION)
});

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request);
    const parsed = deletionRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail(`Type ${PRIVACY_DELETE_CONFIRMATION} to delete your Career OS data.`, "PRIVACY_DELETE_CONFIRMATION_REQUIRED", 400);
    return ok(await privacyService.deleteUserData(user.id));
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail("Could not delete user data.", "PRIVACY_DELETE_FAILED", 500);
    }
  }
}

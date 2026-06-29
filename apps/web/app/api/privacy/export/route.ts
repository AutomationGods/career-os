import { privacyService } from "@career-os/domains";
import { fail, ok } from "../../_lib/responses";
import { requireUser, sessionErrorResponse } from "../../_lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return ok(await privacyService.exportUserData(user.id));
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail("Could not export user data.", "PRIVACY_EXPORT_FAILED", 500);
    }
  }
}

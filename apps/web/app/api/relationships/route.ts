import { readFeatureFlags } from "@career-os/config";
import { listRelationshipPeople } from "@career-os/domains";
import { fail, ok } from "../_lib/responses";
import { requireUser, sessionErrorResponse } from "../_lib/session";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    if (!readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS) return fail("Not found.", "NOT_FOUND", 404);
    return ok({ relationships: listRelationshipPeople() });
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail("Could not load relationships.", "RELATIONSHIPS_FAILED", 500);
    }
  }
}

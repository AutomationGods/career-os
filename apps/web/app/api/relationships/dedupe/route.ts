import { readFeatureFlags } from "@career-os/config";
import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { commandResult, fail } from "../../_lib/responses";
import { requireMutationUser, sessionErrorResponse } from "../../_lib/session";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request);
    if (!readFeatureFlags().ENABLE_PLACEHOLDER_DOMAINS) return fail("Not found.", "NOT_FOUND", 404);
    const body = await request.json().catch(() => ({}));
    const command = createCommand({
      type: "relationships.dedupe",
      requestedBy: "api",
      userId: user.id,
      entityType: "person",
      payload: Array.isArray(body) ? { userId: user.id, people: body } : { userId: user.id, people: body.people ?? [] }
    });
    const result = await createDefaultCommandBus().execute(command);
    return commandResult(result, 200, 400);
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail("Could not dedupe relationships.", "RELATIONSHIPS_DEDUPE_FAILED", 500);
    }
  }
}

import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { commandResult, fail } from "../_lib/responses";
import { requireUser, sessionErrorResponse } from "../_lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const command = createCommand({ type: "resume.templates.list", requestedBy: "api", userId: user.id, entityType: "resume_template_catalog", entityId: "default", payload: { userId: user.id } });
    return commandResult(await createDefaultCommandBus().execute(command));
  } catch (error) {
    try {
      return sessionErrorResponse(error);
    } catch {
      return fail("Could not load resume templates.", "RESUME_TEMPLATES_FAILED", 500);
    }
  }
}

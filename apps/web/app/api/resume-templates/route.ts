import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { commandResult } from "../_lib/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  const command = createCommand({ type: "resume.templates.list", requestedBy: "api", entityType: "resume_template_catalog", entityId: "default", payload: {} });
  return commandResult(await createDefaultCommandBus().execute(command));
}

import { sessionErrorResponse, requireMutationUser } from "../../../_lib/session";
import { createLocalApprovalDemoCommandBus, runDeniedCommand } from "../_handlers";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request);
    return runDeniedCommand(createLocalApprovalDemoCommandBus(), user.id);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

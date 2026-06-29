import { sessionErrorResponse, requireMutationUser } from "../../../_lib/session";
import { createLocalApprovalDemoCommandBus, runAllowedCommand } from "../_handlers";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request);
    return runAllowedCommand(createLocalApprovalDemoCommandBus(), user.id);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

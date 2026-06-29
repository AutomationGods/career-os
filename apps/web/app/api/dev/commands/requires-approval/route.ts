import { sessionErrorResponse, requireMutationUser } from "../../../_lib/session";
import { createLocalApprovalDemoCommandBus, runRequiresApprovalCommand } from "../_handlers";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request);
    return runRequiresApprovalCommand(createLocalApprovalDemoCommandBus(), user.id);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

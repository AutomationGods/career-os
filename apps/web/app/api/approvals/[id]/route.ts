import { prismaApprovalRequestService } from "@career-os/orchestration";
import { getApproval } from "../_handlers";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return getApproval(prismaApprovalRequestService, params.id);
}

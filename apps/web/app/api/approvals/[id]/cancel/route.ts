import { prismaApprovalRequestService } from "@career-os/orchestration";
import { cancelApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return cancelApproval(prismaApprovalRequestService, params.id, request);
}

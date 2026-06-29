import { localApprovalRequestService } from "@career-os/orchestration";
import { approveApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return approveApproval(localApprovalRequestService, (await params).id, request);
}

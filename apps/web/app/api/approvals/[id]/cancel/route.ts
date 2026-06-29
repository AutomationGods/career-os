import { localApprovalRequestService } from "@career-os/orchestration";
import { cancelApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return cancelApproval(localApprovalRequestService, (await params).id, request);
}

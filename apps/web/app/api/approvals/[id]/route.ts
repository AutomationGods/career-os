import { localApprovalRequestService } from "@career-os/orchestration";
import { getApproval } from "../_handlers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getApproval(localApprovalRequestService, (await params).id, request);
}

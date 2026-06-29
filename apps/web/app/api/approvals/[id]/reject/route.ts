import { localApprovalRequestService } from "@career-os/orchestration";
import { rejectApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return rejectApproval(localApprovalRequestService, (await params).id, request);
}

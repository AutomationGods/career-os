import { localApprovalRequestService } from "@career-os/orchestration";
import { listApprovals } from "./_handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return listApprovals(localApprovalRequestService, request);
}

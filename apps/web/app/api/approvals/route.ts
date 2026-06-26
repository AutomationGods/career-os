import { prismaApprovalRequestService } from "@career-os/orchestration";
import { listApprovals } from "./_handlers";

export async function GET() {
  return listApprovals(prismaApprovalRequestService);
}

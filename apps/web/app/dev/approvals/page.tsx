import { prismaApprovalRequestService } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../api/_lib/auth";
import ApprovalTestPanel from "../../approvals/ApprovalTestPanel";
import type { ApprovalView } from "../../approvals/approval-test-panel-model";

export const dynamic = "force-dynamic";

async function getApprovals(userId: string): Promise<ApprovalView[]> {
  try {
    const approvals = (await prismaApprovalRequestService.list()).filter((approval) => approval.userId === userId);
    return approvals.map((approval) => ({
      id: approval.id,
      userId: approval.userId,
      commandId: approval.commandId,
      commandType: approval.commandType,
      permission: approval.permission,
      entityType: approval.entityType,
      entityId: approval.entityId,
      status: approval.status,
      riskLevel: approval.riskLevel,
      reason: approval.reason,
      requestedAt: approval.requestedAt.toISOString(),
      createdAt: approval.createdAt.toISOString(),
      updatedAt: approval.updatedAt.toISOString(),
      decidedAt: approval.decidedAt?.toISOString() ?? null,
      replayStatus: approval.replayStatus ?? "not_started",
      replayedCommandId: approval.replayedCommandId,
      replayAttemptCount: approval.replayAttemptCount ?? 0,
      replayedAt: approval.replayedAt?.toISOString() ?? null
    }));
  } catch {
    return [];
  }
}

export default async function ApprovalsPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const approvals = await getApprovals(authUser.userId);
  const localDemoRoutesEnabled = process.env.CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES === "true";

  return (
    <main className="main">
      <h1>Approval Requests</h1>
      <p className="muted">Sensitive commands wait here for human approval before execution.</p>
      <ApprovalTestPanel initialApprovals={approvals} localDemoRoutesEnabled={localDemoRoutesEnabled} />
    </main>
  );
}

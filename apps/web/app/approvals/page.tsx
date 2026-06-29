import { readFeatureFlags } from "@career-os/config";
import { localApprovalRequestService } from "@career-os/orchestration";
import { requirePageUser, type PageUser } from "../_lib/page-auth";
import ApprovalTestPanel from "./ApprovalTestPanel";
import type { ApprovalView } from "./approval-test-panel-model";

export const dynamic = "force-dynamic";

async function getApprovals(user: PageUser): Promise<ApprovalView[]> {
  try {
    const approvals = await localApprovalRequestService.list();
    const visibleApprovals = user.role === "admin" ? approvals : approvals.filter((approval) => approval.userId === user.id);
    return visibleApprovals.map((approval) => ({
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
  const user = await requirePageUser();
  const approvals = await getApprovals(user);
  const showDevCommandControls = process.env.NODE_ENV !== "production" || readFeatureFlags().ENABLE_DEV_COMMANDS;

  return (
    <main className="main">
      <h1>Approval Requests</h1>
      <p className="muted">Sensitive commands wait here for human approval before execution.</p>
      <ApprovalTestPanel initialApprovals={approvals} showDevCommandControls={showDevCommandControls} />
    </main>
  );
}

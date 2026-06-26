import type { ApprovalRequestRecord, CommandResult } from "@career-os/shared";
import type { ApprovalRequestService } from "./approvals";
import { createCommand, type CommandBus } from "./command-bus";

export interface ApprovalReplayResult {
  approval: ApprovalRequestRecord;
  command: CommandResult;
  replayed: boolean;
  idempotent: boolean;
}

function commandResultFromStoredReplay(approval: ApprovalRequestRecord): CommandResult {
  if (approval.replayResult && typeof approval.replayResult === "object" && "status" in approval.replayResult && "commandId" in approval.replayResult) {
    return approval.replayResult as CommandResult;
  }
  return {
    ok: true,
    status: "completed",
    commandId: approval.replayedCommandId ?? approval.commandId,
    data: { replayStatus: approval.replayStatus, approvalRequestId: approval.id }
  };
}

function replayCommandId(approval: ApprovalRequestRecord) {
  return approval.replayedCommandId ?? `replay_${approval.commandId}_${approval.id}`;
}

export class ApprovalReplayService {
  constructor(private readonly approvals: ApprovalRequestService, private readonly commandBus: CommandBus) {}

  async replay(id: string): Promise<ApprovalReplayResult | CommandResult> {
    const approval = await this.approvals.getById(id);
    if (!approval) {
      return { ok: false, status: "rejected", commandId: "unknown", error: { code: "APPROVAL_NOT_FOUND", message: "Approval request not found." } };
    }

    if (approval.status !== "approved") {
      return { ok: false, status: "rejected", commandId: approval.commandId, approvalRequestId: approval.id, error: { code: "APPROVAL_NOT_APPROVED", message: "Only approved requests can be replayed." } };
    }

    if (approval.commandType === "application.auto_submit") {
      return { ok: false, status: "rejected", commandId: approval.commandId, approvalRequestId: approval.id, error: { code: "REPLAY_DENIED_COMMAND", message: "Denied auto-submit commands cannot be replayed." } };
    }

    if (approval.replayStatus === "completed") {
      return { approval, command: commandResultFromStoredReplay(approval), replayed: false, idempotent: true };
    }

    if (approval.replayStatus === "in_progress") {
      return { ok: false, status: "rejected", commandId: approval.replayedCommandId ?? approval.commandId, approvalRequestId: approval.id, error: { code: "REPLAY_IN_PROGRESS", message: "Replay is already in progress for this approval." } };
    }

    const commandId = replayCommandId(approval);
    const started = await this.approvals.startReplay(approval.id, commandId);
    if (!started) {
      return { ok: false, status: "failed", commandId, approvalRequestId: approval.id, error: { code: "REPLAY_START_FAILED", message: "Could not mark replay as in progress." } };
    }

    const command = createCommand({
      id: commandId,
      type: approval.commandType,
      requestedBy: "system",
      userId: approval.userId,
      entityType: approval.entityType,
      entityId: approval.entityId,
      payload: approval.requestPayload,
      correlationId: approval.id,
      causationId: approval.commandId,
      metadata: {
        approvalReplay: true,
        approvalRequestId: approval.id,
        approvalStatus: approval.status,
        approvalPermission: approval.permission,
        originalCommandId: approval.commandId,
        replayAttemptCount: started.replayAttemptCount
      }
    });

    try {
      const result = await this.commandBus.execute(command);
      const finalApproval = result.ok ? await this.approvals.completeReplay(approval.id, result) : await this.approvals.failReplay(approval.id, result.error ?? result);
      return { approval: finalApproval ?? started, command: result, replayed: true, idempotent: false };
    } catch (error) {
      const result: CommandResult = {
        ok: false,
        status: "failed",
        commandId,
        approvalRequestId: approval.id,
        error: {
          code: "REPLAY_COMMAND_FAILED",
          message: error instanceof Error ? error.message : "Unknown replay command failure"
        }
      };
      const finalApproval = await this.approvals.failReplay(approval.id, result.error);
      return { approval: finalApproval ?? started, command: result, replayed: true, idempotent: false };
    }
  }
}

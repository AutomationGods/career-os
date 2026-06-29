import { ApprovalReplayService, type ApprovalRequestService, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { fail, ok } from "../_lib/responses";
import { requireMutationUser, requireUser, sessionErrorResponse, type AuthenticatedUser } from "../_lib/session";

function isCommandResult(value: unknown): value is { ok: boolean; status: string; commandId: string; approvalRequestId?: string; error?: { code: string; message: string } } {
  return value !== null && typeof value === "object" && "ok" in value && "status" in value && "commandId" in value;
}

export const approvalDecisionSchema = z.object({
  decidedBy: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  decisionPayload: z.unknown().optional()
});

function canAccessApproval(user: AuthenticatedUser, approval: { userId?: string }) {
  return user.role === "admin" || approval.userId === user.id;
}

async function getOwnedApproval(service: ApprovalRequestService, id: string, user: AuthenticatedUser) {
  const approval = await service.getById(id);
  if (!approval || !canAccessApproval(user, approval)) return undefined;
  return approval;
}

export async function listApprovals(service: ApprovalRequestService, request: Request) {
  try {
    const user = await requireUser(request);
    const approvals = await service.list();
    return ok({ approvals: user.role === "admin" ? approvals : approvals.filter((approval) => approval.userId === user.id) });
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function getApproval(service: ApprovalRequestService, id: string, request: Request) {
  try {
    const user = await requireUser(request);
    const approval = await getOwnedApproval(service, id, user);
    if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    return ok({ approval });
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function approveApproval(service: ApprovalRequestService, id: string, request: Request) {
  try {
    const user = await requireMutationUser(request);
    const existing = await getOwnedApproval(service, id, user);
    if (!existing) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
    const approval = await service.approve(id, { ...parsed.data, decidedBy: user.id });
    if (!approval || !canAccessApproval(user, approval)) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    return ok({ approval });
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function rejectApproval(service: ApprovalRequestService, id: string, request: Request) {
  try {
    const user = await requireMutationUser(request);
    const existing = await getOwnedApproval(service, id, user);
    if (!existing) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
    const approval = await service.reject(id, { ...parsed.data, decidedBy: user.id });
    if (!approval || !canAccessApproval(user, approval)) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    return ok({ approval });
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function cancelApproval(service: ApprovalRequestService, id: string, request: Request) {
  try {
    const user = await requireMutationUser(request);
    const existing = await getOwnedApproval(service, id, user);
    if (!existing) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
    const approval = await service.cancel(id, { ...parsed.data, decidedBy: user.id });
    if (!approval || !canAccessApproval(user, approval)) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    return ok({ approval });
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function replayApproval(service: ApprovalRequestService, bus: CommandBus, id: string, request: Request) {
  try {
    const user = await requireMutationUser(request);
    const existing = await getOwnedApproval(service, id, user);
    if (!existing) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
    const result = await new ApprovalReplayService(service, bus).replay(id);
    if (isCommandResult(result)) return Response.json({ ok: false, error: result.error, command: { id: result.commandId, status: result.status, approvalRequestId: result.approvalRequestId } }, { status: 400 });
    if (!result.command.ok) return Response.json({ ok: false, error: result.command.error, command: { id: result.command.commandId, status: result.command.status, approvalRequestId: result.approval.id } }, { status: 400 });
    return ok(result);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

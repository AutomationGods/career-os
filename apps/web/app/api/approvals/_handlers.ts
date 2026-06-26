import type { ApprovalRequestService } from "@career-os/orchestration";
import { z } from "zod";
import { fail, ok } from "../_lib/responses";

export const approvalDecisionSchema = z.object({
  decidedBy: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  decisionPayload: z.unknown().optional()
});

export async function listApprovals(service: ApprovalRequestService) {
  const approvals = await service.list();
  return ok({ approvals });
}

export async function getApproval(service: ApprovalRequestService, id: string) {
  const approval = await service.getById(id);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

export async function approveApproval(service: ApprovalRequestService, id: string, request: Request) {
  const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
  const approval = await service.approve(id, parsed.data);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

export async function rejectApproval(service: ApprovalRequestService, id: string, request: Request) {
  const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
  const approval = await service.reject(id, parsed.data);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

export async function cancelApproval(service: ApprovalRequestService, id: string, request: Request) {
  const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
  const approval = await service.cancel(id, parsed.data);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

import type { CommandResult } from "@career-os/shared";
import { z } from "zod";

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  cursor: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  projectionType: z.string().min(1).optional(),
  snapshotType: z.string().min(1).optional()
});

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function paginated<T extends { id: string }>(items: T[], limit: number): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;
  return { items: sliced, nextCursor, hasMore };
}

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function fail(message: string, code = "REQUEST_FAILED", status = 500) {
  return Response.json({ ok: false, error: { message, code } }, { status });
}

export function commandResult(result: CommandResult, successStatus = 200, failureStatus = 400) {
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error, command: { id: result.commandId, status: result.status, approvalRequestId: result.approvalRequestId } }, { status: failureStatus });
  }

  return Response.json({ ok: true, data: { commandId: result.commandId, status: result.status, result: result.data } }, { status: successStatus });
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

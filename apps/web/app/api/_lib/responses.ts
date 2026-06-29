import type { CommandResult } from "@career-os/shared";
import { z } from "zod";

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  userId: z.string().min(1).optional(),
  eventType: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  projectionType: z.string().min(1).optional(),
  snapshotType: z.string().min(1).optional()
});

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

const sensitiveErrorPatterns = [/prisma/i, /\bP\d{4}\b/, /database_url/i, /sql/i, /stack/i, /secret/i, /token/i, /password/i, /connection string/i];

function safeMessage(message: string, status: number) {
  if (status >= 500 && process.env.NODE_ENV === "production") return "Request failed.";
  if (sensitiveErrorPatterns.some((pattern) => pattern.test(message))) return "Request failed.";
  return message;
}

export function fail(message: string, code = "REQUEST_FAILED", status = 500) {
  return Response.json({ ok: false, error: { message: safeMessage(message, status), code } }, { status });
}

export function commandResult(result: CommandResult, successStatus = 200, failureStatus = 400) {
  if (!result.ok) {
    const error = result.error ? { ...result.error, message: safeMessage(result.error.message, failureStatus) } : undefined;
    return Response.json({ ok: false, error, command: { id: result.commandId, status: result.status, approvalRequestId: result.approvalRequestId } }, { status: failureStatus });
  }

  return Response.json({ ok: true, data: { commandId: result.commandId, status: result.status, result: result.data } }, { status: successStatus });
}

export function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return safeMessage(message, 500);
}

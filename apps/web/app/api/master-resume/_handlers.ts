import { createCommand, createDefaultCommandBus, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";
import { requireMutationUser, requireUser, sessionErrorResponse } from "../_lib/session";

export const masterResumeGetSchema = z.object({
  userId: z.string().min(1).optional()
});

export const masterResumeImportSchema = z.object({
  userId: z.string().min(1).optional(),
  resumeText: z.string().trim().min(1),
  source: z.string().trim().min(1).optional().default("pasted_plain_text")
});

type BusLike = Pick<CommandBus, "execute">;

function busOrDefault(bus?: BusLike) {
  return bus ?? createDefaultCommandBus();
}

export async function getMasterResume(request: Request, bus?: BusLike) {
  try {
    const user = await requireUser(request);
    const query = masterResumeGetSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return fail("Invalid master resume query.", "INVALID_MASTER_RESUME_QUERY", 400);
    const payload = { ...query.data, userId: user.id };
    const command = createCommand({ type: "master_resume.get", requestedBy: "api", userId: user.id, entityType: "user", entityId: user.id, payload });
    return commandResult(await busOrDefault(bus).execute(command));
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

export async function importMasterResume(request: Request, bus?: BusLike) {
  try {
    const user = await requireMutationUser(request);
    const parsed = masterResumeImportSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return fail("Invalid master resume import payload.", "INVALID_MASTER_RESUME_IMPORT", 400);
    const payload = { ...parsed.data, userId: user.id };
    const command = createCommand({ type: "master_resume.import", requestedBy: "api", userId: user.id, entityType: "user", entityId: user.id, payload });
    return commandResult(await busOrDefault(bus).execute(command), 201, 400);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

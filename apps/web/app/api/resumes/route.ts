import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { commandResult, fail } from "../_lib/responses";
import { requireMutationUser, sessionErrorResponse } from "../_lib/session";
import { resumeGenerateRequestSchema } from "./schema";

export async function POST(request: Request) {
  try {
    const user = await requireMutationUser(request);
    const parsed = resumeGenerateRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Invalid resume generation request.", "INVALID_RESUME_REQUEST", 400);
    }

    const body = { ...parsed.data, userId: user.id };
    const command = createCommand({
      type: "resume.generate",
      requestedBy: "api",
      userId: user.id,
      entityType: "application_packet",
      entityId: body.applicationPacketId,
      payload: body
    });

    const result = await createDefaultCommandBus().execute(command);
    return commandResult(result, 201, 400);
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

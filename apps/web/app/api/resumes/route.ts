import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { commandResult, fail } from "../_lib/responses";
import { resumeGenerateRequestSchema } from "./schema";

export async function POST(request: Request) {
  const parsed = resumeGenerateRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail("Invalid resume generation request.", "INVALID_RESUME_REQUEST", 400);
  }

  const body = parsed.data;
  const command = createCommand({
    type: "resume.generate",
    requestedBy: "api",
    entityType: "application_packet",
    entityId: body.applicationPacketId,
    payload: body
  });

  const result = await createDefaultCommandBus().execute(command);
  return commandResult(result, 201, 400);
}

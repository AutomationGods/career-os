import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";

export const resumeGenerateRequestSchema = z.object({
  userId: z.string().min(1).optional(),
  jobId: z.string().min(1),
  companyId: z.string().min(1),
  applicationPacketId: z.string().min(1),
  resumeVersionId: z.string().min(1).optional(),
  verifiedFacts: z.array(z.string().min(1)).optional().default([]),
  targetRole: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  jobDescription: z.string().min(1).optional(),
  targetKeywords: z.array(z.string().min(1)).optional()
});

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

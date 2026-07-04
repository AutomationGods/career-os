import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({
  title: z.string().min(1).default("Pasted career document"),
  documentType: z.enum(["resume", "cover_letter", "performance_review", "portfolio", "job_history", "other"]).default("resume"),
  originalFilename: z.string().optional(),
  contentText: z.string().min(20),
  workspaceId: z.string().default("default")
});

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid source document import request.", "INVALID_SOURCE_DOCUMENT_IMPORT_REQUEST", 400);
  const command = createCommand({
    type: "source_documents.import",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "source_document",
    entityId: `source_document_${Date.now()}`,
    payload: parsed.data
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 201, 400);
}

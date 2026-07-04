import { createCommand } from "@career-os/orchestration";
import { z } from "zod";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult, fail } from "../../_lib/responses";

const schema = z.object({ sourceDocumentId: z.string().optional(), workspaceId: z.string().default("default") });

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid claim extraction request.", "INVALID_CLAIM_EXTRACTION_REQUEST", 400);
  const command = createCommand({
    type: "source_documents.extract_claims",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "source_document",
    entityId: parsed.data.sourceDocumentId ?? `source_documents_${authUser.userId}`,
    payload: parsed.data
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}

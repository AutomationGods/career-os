import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../../../_lib/auth";
import { executeCommandForReview } from "../../../../_lib/command-runtime";
import { getPersistentApplicationPacket, listPersistentResumeDraftProjections } from "../../../../_lib/persistent-state";
import { fail } from "../../../../_lib/responses";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "resume";
}

function draftMarkdown(packetTitle: string, companyName: string, draft: Record<string, unknown>) {
  const content = typeof draft.content === "string" ? draft.content : "";
  const draftId = typeof draft.id === "string" ? draft.id : "unknown";
  return [
    `# ${packetTitle}`,
    "",
    `Company: ${companyName}`,
    `Draft ID: ${draftId}`,
    "Export mode: local markdown download only",
    "Review required: true",
    "",
    content
  ].join("\n");
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  const [packet, drafts] = await Promise.all([
    getPersistentApplicationPacket(authUser.userId, params.id),
    listPersistentResumeDraftProjections(authUser.userId)
  ]);

  if (!packet) return fail("Application packet not found.", "PACKET_NOT_FOUND", 404);

  const projection = drafts.find((draft) => draft.entityId === params.id);
  const draft = isRecord(projection?.data?.draft) ? projection.data.draft : undefined;
  if (!draft) return fail("No resume draft found for this packet.", "RESUME_DRAFT_NOT_FOUND", 404);

  const title = packet.selectedJob.title;
  const companyName = packet.selectedCompany?.name ?? packet.selectedJob.company;
  const markdown = draftMarkdown(title, companyName, draft);
  const filename = `${sanitizeFilename(companyName)}-${sanitizeFilename(title)}-resume.md`;

  const command = createCommand({
    type: "documents.export",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "application_packet",
    entityId: params.id,
    payload: {
      applicationPacketId: params.id,
      documentType: "resume_markdown",
      draftId: typeof draft.id === "string" ? draft.id : undefined,
      filename,
      markdown
    }
  });
  const { result } = await executeCommandForReview(request, command);
  if (!result.ok) return fail(result.error?.message ?? "Unable to record local export.", result.error?.code ?? "DOCUMENT_EXPORT_FAILED", 400);

  return new Response(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}

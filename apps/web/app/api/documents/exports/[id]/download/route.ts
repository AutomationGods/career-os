import { createCommand, createDefaultCommandBus } from "@career-os/orchestration";
import { requireUser, sessionErrorResponse } from "../../../../_lib/session";

export const dynamic = "force-dynamic";

function notFound() {
  return Response.json({ ok: false, error: { code: "DOCUMENT_EXPORT_NOT_FOUND", message: "Document export not found." } }, { status: 404 });
}

function contentDisposition(filename: string) {
  return `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}"`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const command = createCommand({ type: "document_exports.get", requestedBy: "api", userId: user.id, entityType: "document_export", entityId: (await params).id, payload: { id: (await params).id, userId: user.id } });
    const result = await createDefaultCommandBus().execute(command);
    if (!result.ok) return notFound();
    const record = (result.data as { export?: { content?: { filename?: string; mimeType?: string; textContent?: string; contentBase64?: string; format?: string } } } | undefined)?.export;
    const content = record?.content;
    if (!content?.filename || !content.mimeType) return notFound();

    if (content.format === "docx") {
      if (!content.contentBase64) return notFound();
      return new Response(Buffer.from(content.contentBase64, "base64"), {
        headers: {
          "content-type": content.mimeType,
          "content-disposition": contentDisposition(content.filename),
          "cache-control": "no-store"
        }
      });
    }

    if (!content.textContent) return notFound();
    return new Response(content.textContent, {
      headers: {
        "content-type": content.mimeType,
        "content-disposition": contentDisposition(content.filename),
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return sessionErrorResponse(error);
  }
}

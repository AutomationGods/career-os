import { createCommand } from "@career-os/orchestration";
import { resetCareerCommandStateWithFallback } from "../../career-command/_lib/state-reset";
import { isUnauthenticatedError, requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { fail } from "../../_lib/responses";
import { MAX_RESUME_UPLOAD_BYTES, ResumeFileParseError, parseResumeFile } from "./resume-file-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const documentTypes = new Set(["resume", "cover_letter", "performance_review", "portfolio", "job_history", "other"]);

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function titleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Uploaded resume";
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function uploadFailureStatus(error: { code?: string; message?: string } | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("database is unavailable") || message.includes("too many open connections")) return 503;
  return 400;
}

async function clearStaleCareerCommandState(request: Request, userId: string) {
  try {
    await resetCareerCommandStateWithFallback(request, userId);
  } catch {
    // Keep the original upload error visible; reset failures are covered by the status endpoint fallback.
  }
}

export async function POST(request: Request) {
  let authUser: Awaited<ReturnType<typeof requireAuthenticatedCareerUser>> | undefined;
  try {
    authUser = await requireAuthenticatedCareerUser();
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return fail("Upload a resume file using multipart form data.", "INVALID_RESUME_UPLOAD_FORM", 400);
    }

    const file = formData.get("file");
    if (!isUploadedFile(file)) return fail("Resume file is required.", "RESUME_FILE_REQUIRED", 400);
    if (file.size > MAX_RESUME_UPLOAD_BYTES) {
      await clearStaleCareerCommandState(request, authUser.userId);
      return fail("Resume file is too large. Upload a file under 8 MB.", "RESUME_FILE_TOO_LARGE", 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseResumeFile({ filename: file.name, contentType: file.type, buffer });
    const requestedDocumentType = stringField(formData, "documentType") || "resume";
    const documentType = documentTypes.has(requestedDocumentType) ? requestedDocumentType : "resume";
    const title = stringField(formData, "title") || titleFromFilename(file.name);
    const workspaceId = stringField(formData, "workspaceId") || "default";
    const command = createCommand({
      type: "source_documents.import",
      requestedBy: "api",
      userId: authUser.userId,
      entityType: "source_document",
      entityId: `source_document_${Date.now()}`,
      payload: {
        title,
        documentType,
        originalFilename: file.name,
        contentText: parsed.text,
        sourceRef: `file-upload:${file.name}`,
        workspaceId
      }
    });
    const { result } = await executeCommandForReview(request, command);
    if (!result.ok) {
      await clearStaleCareerCommandState(request, authUser.userId);
      return Response.json({ ok: false, error: result.error, command: { id: result.commandId, status: result.status, approvalRequestId: result.approvalRequestId } }, { status: uploadFailureStatus(result.error) });
    }

    return Response.json({
      ok: true,
      data: {
        commandId: result.commandId,
        status: result.status,
        result: result.data,
        parseMetadata: {
          filename: file.name,
          contentType: file.type || "unknown",
          size: file.size,
          parser: parsed.parser,
          extractedCharacterCount: parsed.text.length,
          warnings: parsed.warnings
        }
      }
    }, { status: 201 });
  } catch (error) {
    if (authUser && !isUnauthenticatedError(error)) await clearStaleCareerCommandState(request, authUser.userId);
    if (error instanceof ResumeFileParseError) return fail(error.message, error.code, error.status);
    if (isUnauthenticatedError(error)) return fail("Sign in, then retry the resume upload.", "RESUME_UPLOAD_AUTH_REQUIRED", 401);
    return fail(error instanceof Error ? `Resume upload could not complete: ${error.message}` : "Resume upload could not complete. Check the web server logs and retry.", "RESUME_UPLOAD_FAILED", 500);
  }
}

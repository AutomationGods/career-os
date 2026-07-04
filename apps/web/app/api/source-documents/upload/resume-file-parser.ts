import mammoth from "mammoth";
import WordExtractor from "word-extractor";

export const MAX_RESUME_UPLOAD_BYTES = 8 * 1024 * 1024;

export interface ResumeFileParseInput {
  filename: string;
  contentType?: string;
  buffer: Buffer;
}

export interface ResumeFileParseResult {
  text: string;
  parser: "pdf-parse" | "mammoth" | "word-extractor" | "plain-text";
  warnings: string[];
}

export class ResumeFileParseError extends Error {
  constructor(message: string, readonly code = "RESUME_FILE_PARSE_FAILED", readonly status = 400) {
    super(message);
    this.name = "ResumeFileParseError";
  }
}

function extensionFor(filename: string) {
  return filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

function normalizeExtractedText(value: string) {
  return value.replace(/\u0000/g, " ").replace(/\r\n/g, "\n").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function stripRtf(value: string) {
  return value
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ");
}

function assertText(text: string) {
  const normalized = normalizeExtractedText(text);
  if (normalized.length < 20) {
    throw new ResumeFileParseError("No usable resume text could be extracted. Paste the text manually or upload a text-based PDF/DOC/DOCX file.", "RESUME_TEXT_NOT_EXTRACTED", 400);
  }
  return normalized;
}

async function parsePdf(buffer: Buffer): Promise<ResumeFileParseResult> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: assertText(result.text), parser: "pdf-parse", warnings: [] };
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer): Promise<ResumeFileParseResult> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: assertText(result.value), parser: "mammoth", warnings: result.messages.map((message) => message.message) };
}

async function parseDoc(buffer: Buffer): Promise<ResumeFileParseResult> {
  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);
  return { text: assertText(document.getBody()), parser: "word-extractor", warnings: [] };
}

function parsePlainText(buffer: Buffer, extension: string): ResumeFileParseResult {
  const decoded = buffer.toString("utf8");
  const text = extension === "rtf" ? stripRtf(decoded) : decoded;
  return { text: assertText(text), parser: "plain-text", warnings: [] };
}

export async function parseResumeFile(input: ResumeFileParseInput): Promise<ResumeFileParseResult> {
  if (input.buffer.byteLength > MAX_RESUME_UPLOAD_BYTES) {
    throw new ResumeFileParseError("Resume file is too large. Upload a file under 8 MB.", "RESUME_FILE_TOO_LARGE", 413);
  }

  const extension = extensionFor(input.filename);
  const contentType = input.contentType?.toLowerCase() ?? "";

  try {
    if (extension === "pdf" || contentType.includes("pdf")) return await parsePdf(input.buffer);
    if (extension === "docx" || contentType.includes("wordprocessingml")) return await parseDocx(input.buffer);
    if (extension === "doc" || contentType === "application/msword") return await parseDoc(input.buffer);
    if (["txt", "md", "rtf"].includes(extension) || contentType.startsWith("text/")) return parsePlainText(input.buffer, extension);
  } catch (error) {
    if (error instanceof ResumeFileParseError) throw error;
    if (extension === "docx" || contentType.includes("wordprocessingml")) {
      throw new ResumeFileParseError("Could not read this DOCX resume. Re-save it from Word or Google Docs as a fresh .docx file, or paste the resume text manually.", "DOCX_RESUME_PARSE_FAILED", 400);
    }
    if (extension === "doc" || contentType === "application/msword") {
      throw new ResumeFileParseError("Could not read this DOC resume. Save it as .docx or paste the resume text manually.", "DOC_RESUME_PARSE_FAILED", 400);
    }
    if (extension === "pdf" || contentType.includes("pdf")) {
      throw new ResumeFileParseError("Could not read this PDF resume. Upload a text-based PDF or paste the resume text manually.", "PDF_RESUME_PARSE_FAILED", 400);
    }
    throw new ResumeFileParseError(error instanceof Error ? error.message : "Resume file could not be parsed.");
  }

  throw new ResumeFileParseError("Unsupported resume file type. Upload PDF, DOCX, DOC, TXT, MD, or RTF.", "UNSUPPORTED_RESUME_FILE_TYPE", 400);
}

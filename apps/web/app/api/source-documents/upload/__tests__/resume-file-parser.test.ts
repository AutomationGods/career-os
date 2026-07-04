import { describe, expect, it } from "vitest";
import { MAX_RESUME_UPLOAD_BYTES, ResumeFileParseError, parseResumeFile } from "../resume-file-parser";

const resumeText = "Splunk Architect\nBuilt SIEM automation with Cribl and AWS for security operations teams.";

describe("resume file parser", () => {
  it("extracts text from plain text resumes", async () => {
    const result = await parseResumeFile({ filename: "resume.txt", contentType: "text/plain", buffer: Buffer.from(resumeText, "utf8") });

    expect(result.parser).toBe("plain-text");
    expect(result.text.includes("Splunk Architect")).toBe(true);
  });

  it("rejects unsupported resume file types", async () => {
    let error: unknown;
    try {
      await parseResumeFile({ filename: "resume.png", contentType: "image/png", buffer: Buffer.from("not a resume", "utf8") });
    } catch (caught) {
      error = caught;
    }

    expect(error instanceof ResumeFileParseError).toBe(true);
    expect((error as ResumeFileParseError).code).toBe("UNSUPPORTED_RESUME_FILE_TYPE");
  });

  it("rejects oversized resume files before parsing", async () => {
    let error: unknown;
    try {
      await parseResumeFile({ filename: "resume.txt", contentType: "text/plain", buffer: Buffer.alloc(MAX_RESUME_UPLOAD_BYTES + 1) });
    } catch (caught) {
      error = caught;
    }

    expect(error instanceof ResumeFileParseError).toBe(true);
    expect((error as ResumeFileParseError).code).toBe("RESUME_FILE_TOO_LARGE");
  });
});

import { describe, expect, it } from "vitest";
import { BLOCKED_DEMO_KEYWORDS, DOCUMENT_EXPORT_WARNING_TEXT, SAFETY_WARNINGS, buildKeywordAlignment, buildResumeDemoPayload, documentExportResultFromEnvelope, resumeResultFromEnvelope, uniqueStrings } from "./resume-demo-panel-model";

describe("resume demo panel model", () => {
  it("builds the default Splunk/Cribl demo payload without unsupported claims", () => {
    const payload = buildResumeDemoPayload();
    const facts = payload.verifiedFacts.join(" ");

    expect(payload.targetRole).toBe("Splunk / Cribl Platform Engineer");
    expect(payload.companyName).toBe("Demo Commercial Company");
    expect(payload.jobDescription.includes("CISSP and Security+ preferred")).toBe(true);
    expect(facts.includes("Splunk")).toBe(true);
    expect(facts.includes("Cribl")).toBe(true);
    expect(facts.includes("CISSP")).toBe(false);
    expect(facts.includes("Security+")).toBe(false);
    expect(facts.includes("Top Secret")).toBe(false);
  });

  it("formats keyword alignment with verified, missing, and blocked keywords", () => {
    const payload = buildResumeDemoPayload();
    const alignment = buildKeywordAlignment(payload);

    expect(["Splunk", "Cribl", "SIEM", "Linux", "Terraform", "AWS", "Azure", "GCP"].every((keyword) => alignment.verifiedMatches.includes(keyword))).toBe(true);
    expect(["CISSP", "Security+"].every((keyword) => alignment.missingKeywords.includes(keyword))).toBe(true);
    expect(["active clearance", "Top Secret", "TS/SCI"].every((keyword) => alignment.blockedKeywords.includes(keyword))).toBe(true);
  });

  it("deduplicates display strings before rendering repeated warnings or claims", () => {
    expect(uniqueStrings(["Human review required", "Human review required", "  Grounded claim  "]).join("|"))
      .toBe("Human review required|Grounded claim");
  });

  it("preserves safety warnings required by the demo page", () => {
    expect(SAFETY_WARNINGS.join("|")).toBe(`This resume is a draft for local review only.|Career OS did not email, upload, submit, or apply to anything.|Verify employer history, dates, and metrics before using externally.|${DOCUMENT_EXPORT_WARNING_TEXT}`);
    expect(BLOCKED_DEMO_KEYWORDS.includes("fake employer history")).toBe(true);
  });

  it("extracts resume API success envelopes for display", () => {
    const result = resumeResultFromEnvelope({
      ok: true,
      data: {
        commandId: "command-1",
        status: "completed",
        result: {
          reviewRequired: true,
          sourceSnapshotId: "snapshot-1",
          draft: {
            id: "resume_draft_1",
            jobId: "job-1",
            companyId: "company-1",
            applicationPacketId: "packet-1",
            reviewRequired: true,
            sections: [{ title: "Most relevant verified facts", bullets: ["Built Splunk SIEM dashboards."] }],
            content: "Review required\n\n## Most relevant verified facts\n- Built Splunk SIEM dashboards.",
            sourceFacts: ["Built Splunk SIEM dashboards."],
            targetKeywords: ["splunk"],
            matchedFactCount: 1,
            unmatchedFactCount: 0,
            warnings: ["Human review required."]
          },
          guard: { ok: true, blockedClaims: [], groundedClaims: ["Built Splunk SIEM dashboards."], warnings: [] },
          warnings: ["Human review required."]
        }
      }
    });

    expect(result.commandId).toBe("command-1");
    expect(result.commandStatus).toBe("completed");
    expect(result.draft?.id).toBe("resume_draft_1");
    expect(result.guard?.ok).toBe(true);
  });

  it("extracts resume API failure envelopes for display", () => {
    const result = resumeResultFromEnvelope({
      ok: false,
      error: { code: "INVALID_RESUME_REQUEST", message: "Invalid resume generation request." },
      command: { id: "command-2", status: "rejected" }
    });

    expect(result.commandStatus).toBe("rejected");
    expect(result.errorCode).toBe("INVALID_RESUME_REQUEST");
    expect(result.errorMessage).toBe("Invalid resume generation request.");
  });

  it("surfaces truthfulness-blocked claims from failure envelopes", () => {
    const result = resumeResultFromEnvelope({
      ok: false,
      error: {
        code: "UNSUPPORTED_RESUME_CLAIMS_BLOCKED",
        message: "Resume draft contains claims not grounded in verifiedFacts.",
        details: { blockedClaims: ["Held active Top Secret clearance."] }
      },
      command: { id: "command-3", status: "rejected" }
    });
    const alignment = buildKeywordAlignment(buildResumeDemoPayload(), result);

    expect(result.guard?.ok).toBe(false);
    expect(result.guard?.blockedClaims[0]).toBe("Held active Top Secret clearance.");
    expect(alignment.blockedKeywords.includes("Blocked claim: Held active Top Secret clearance.")).toBe(true);
  });

  it("extracts document export results for display", () => {
    const result = documentExportResultFromEnvelope({
      ok: true,
      data: {
        commandId: "command-export-1",
        status: "completed",
        result: {
          downloadUrl: "/api/documents/exports/export-1/download",
          warningText: DOCUMENT_EXPORT_WARNING_TEXT,
          externalActionTaken: false,
          export: {
            id: "export-1",
            documentType: "resume",
            format: "markdown",
            createdAt: "2026-06-27T00:00:00.000Z",
            content: { filename: "resume.md", mimeType: "text/markdown", checksum: "abc", byteLength: 123, warningText: DOCUMENT_EXPORT_WARNING_TEXT }
          }
        }
      }
    });

    expect(result.commandStatus).toBe("completed");
    expect(result.export?.id).toBe("export-1");
    expect(result.downloadUrl).toBe("/api/documents/exports/export-1/download");
    expect(result.externalActionTaken).toBe(false);
    expect(result.warningText).toBe(DOCUMENT_EXPORT_WARNING_TEXT);
  });
});

import { describe, expect, it } from "vitest";
import { DOCUMENT_EXPORT_WARNING_TEXT, createResumeExportArtifact, renderResumeMarkdown } from "../index";

const draft = {
  id: "resume_draft_test",
  templateName: "ATS Technical v2",
  sections: [
    { title: "Technical Skills", bullets: ["Splunk Enterprise", "Cribl Stream"] },
    { title: "Experience Highlights", bullets: ["Built Terraform modules for AWS observability workloads."] }
  ],
  reviewChecklist: [{ label: "Human review required", status: "review", detail: "Confirm every claim before use." }],
  sourceFacts: ["Splunk Enterprise", "Cribl Stream", "Built Terraform modules for AWS observability workloads."]
};

describe("document exporters", () => {
  it("renders ATS-friendly markdown from resume sections", () => {
    const markdown = renderResumeMarkdown(draft);

    expect(markdown.includes("# Resume Draft")).toBe(true);
    expect(markdown.includes("## Technical Skills")).toBe(true);
    expect(markdown.includes("- Splunk Enterprise")).toBe(true);
    expect(markdown.includes(DOCUMENT_EXPORT_WARNING_TEXT)).toBe(true);
    expect(markdown.includes("CISSP")).toBe(false);
    expect(markdown.includes("Security+")).toBe(false);
  });

  it("creates a minimal DOCX package without graphics or hidden custom metadata", () => {
    const artifact = createResumeExportArtifact({ draft, format: "docx" });
    const zipText = artifact.bytes.toString("utf8");

    expect(artifact.filename).toBe("resume-draft-test.docx");
    expect(artifact.mimeType.includes("wordprocessingml.document")).toBe(true);
    expect(artifact.bytes.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(zipText.includes("word/document.xml")).toBe(true);
    expect(zipText.includes("Splunk Enterprise")).toBe(true);
    expect(zipText.includes("docProps")).toBe(false);
    expect(zipText.includes("<w:tbl")).toBe(false);
    expect(zipText.includes("CISSP")).toBe(false);
    expect(createResumeExportArtifact({ draft, format: "docx" }).checksum).toBe(artifact.checksum);
  });
});

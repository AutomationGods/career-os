import { DOCUMENT_EXPORT_WARNING_TEXT } from "@career-os/documents";
import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { DocumentExportManager } from "../manager";
import { InMemoryDocumentExportStore } from "../document-export-store";

const draft = {
  id: "resume_draft_export_test",
  templateName: "ATS Technical v2",
  jobId: "job-1",
  companyId: "company-1",
  applicationPacketId: "packet-1",
  sections: [
    { key: "technical_skills", title: "Technical Skills", bullets: ["Splunk Enterprise", "Cribl Stream"] },
    { key: "experience_highlights", title: "Experience Highlights", bullets: ["Built Terraform modules for AWS observability workloads."] }
  ],
  content: "# Resume Draft",
  sourceFacts: ["Splunk Enterprise", "Cribl Stream", "Built Terraform modules for AWS observability workloads."],
  targetKeywords: ["Splunk", "Cribl", "Terraform"],
  missingKeywords: ["CISSP"],
  matchedFactCount: 3,
  unmatchedFactCount: 0,
  reviewChecklist: [{ id: "human-review", label: "Human review required", status: "review", detail: "Confirm every claim before use." }],
  warnings: ["Human review required before export, upload, send, or submission."]
};

function createContext() {
  return {
    eventStore: new InMemoryEventStore(),
    stateStore: new InMemoryStateStore(),
    snapshotStore: new InMemorySnapshotStore(),
    documentExportStore: new InMemoryDocumentExportStore()
  };
}

function command(type: string, payload: Record<string, unknown>) {
  const userId = typeof payload.userId === "string" ? payload.userId : "user-1";
  return { id: `command-${type}`, type, requestedBy: "api" as const, userId, entityType: "resume", entityId: draft.id, payload: { ...payload, userId }, createdAt: new Date().toISOString() };
}

describe("DocumentExportManager", () => {
  it("creates local markdown exports with events and projections", async () => {
    const context = createContext();
    const result = await new DocumentExportManager().handle(command("document_exports.create_markdown", { userId: "user-1", resumeDraft: draft, blockedProfileClaims: ["CISSP", "Security+", "active clearance"] }), context);

    expect(result.ok).toBe(true);
    const data = result.data as { export: { id: string; content?: { textContent?: string; checksum?: string }; metadata?: { externalActionTaken?: boolean } }; warningText: string; externalActionTaken: false };
    expect(data.warningText).toBe(DOCUMENT_EXPORT_WARNING_TEXT);
    expect(data.externalActionTaken).toBe(false);
    expect(Boolean(data.export.content?.textContent?.includes("Splunk Enterprise"))).toBe(true);
    expect(Boolean(data.export.content?.textContent?.includes("CISSP"))).toBe(false);
    expect(data.export.metadata?.externalActionTaken).toBe(false);
    expect(context.eventStore.listByType("document_export.requested").length).toBe(1);
    expect(context.eventStore.listByType("document_export.markdown_generated").length).toBe(1);
    expect(context.eventStore.listByType("resume.export_markdown_generated").length).toBe(1);
    expect(Boolean(context.stateStore.getProjection("document_export", data.export.id, "document_export.current_status"))).toBe(true);
    expect(Boolean(context.stateStore.getProjection("resume", draft.id, "resume.current_exports"))).toBe(true);
  });

  it("creates local DOCX exports through the exporter interface", async () => {
    const context = createContext();
    const result = await new DocumentExportManager().handle(command("document_exports.create_docx", { userId: "user-1", resumeDraft: draft, blockedProfileClaims: ["CISSP"] }), context);

    expect(result.ok).toBe(true);
    const data = result.data as { export: { content?: { contentBase64?: string; filename?: string; mimeType?: string } } };
    const docxBytes = Buffer.from(data.export.content?.contentBase64 ?? "", "base64");
    expect(data.export.content?.filename).toBe("resume-draft-export-test.docx");
    expect(Boolean(data.export.content?.mimeType?.includes("wordprocessingml.document"))).toBe(true);
    expect(docxBytes.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(docxBytes.toString("utf8").includes("CISSP")).toBe(false);
    expect(context.eventStore.listByType("document_export.docx_generated").length).toBe(1);
    expect(context.eventStore.listByType("resume.export_docx_generated").length).toBe(1);
  });

  it("blocks exports when draft bullets are not grounded in source facts", async () => {
    const context = createContext();
    const unsafeDraft = { ...draft, sections: [{ title: "Technical Skills", bullets: ["CISSP"] }], sourceFacts: ["Splunk Enterprise"] };
    const result = await new DocumentExportManager().handle(command("document_exports.create_markdown", { userId: "user-1", resumeDraft: unsafeDraft, blockedProfileClaims: ["CISSP"] }), context);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("DOCUMENT_EXPORT_TRUTHFULNESS_FAILED");
    expect(context.eventStore.listByType("document_export.failed").length).toBe(1);
    expect(context.eventStore.listByType("document_export.markdown_generated").length).toBe(0);
  });

  it("lists and retrieves exports from the local export store", async () => {
    const context = createContext();
    const manager = new DocumentExportManager();
    const created = await manager.handle(command("document_exports.create_markdown", { userId: "user-1", resumeDraft: draft }), context);
    const exportId = (created.data as { export: { id: string } }).export.id;
    const got = await manager.handle(command("document_exports.get", { id: exportId, userId: "user-1" }), context);
    const listed = await manager.handle(command("document_exports.list", { userId: "user-1" }), context);

    expect(got.ok).toBe(true);
    expect((listed.data as { exports: unknown[] }).exports.length).toBe(1);
  });
});

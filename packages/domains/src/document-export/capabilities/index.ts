export const documentExportCapability = {
  name: "DocumentExportCapability",
  workers: ["DocumentExportWorker"],
  commands: ["document_exports.create_markdown", "document_exports.create_docx", "document_exports.get", "document_exports.list"],
  events: ["document_export.requested", "document_export.markdown_generated", "document_export.docx_generated", "document_export.failed", "resume.export_markdown_generated", "resume.export_docx_generated"],
  permissions: ["export_document"]
};

export const capabilities = [documentExportCapability.name];

# Document Export Domain

Implemented for local-only Markdown and DOCX resume exports.

## Command path

```text
/resumes or /documents UI → Document Export API → Command Bus → Orchestrator → DocumentExportManager → DocumentExportWorker → MarkdownExportTool / DocxExportTool → Event Store → State Store → Snapshot Store
```

## Commands

- `document_exports.create_markdown`
- `document_exports.create_docx`
- `document_exports.get`
- `document_exports.list`

## Events

- `document_export.requested`
- `document_export.markdown_generated`
- `document_export.docx_generated`
- `document_export.failed`
- `resume.export_markdown_generated`
- `resume.export_docx_generated`

## Projections

- `document_export.current_status`
- `resume.current_exports`

## Storage

`DocumentExport` stores the local export record and `local://career-os/document-exports/...` URL.

`DocumentVersion.content` stores Markdown text or DOCX base64 content in local database JSON.

`DocumentMetadata.metadata` stores checksum, byte length, MIME type, source resume ID, and the local-only warning.

## Non-goals

No external upload, email send, application submit, browser automation, Chrome extension, LinkedIn scraping, Gmail/Calendar call, file upload to a third party, or AI provider call is implemented.

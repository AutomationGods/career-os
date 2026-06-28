# Document Export Domain

Document Export v1 creates local-only Markdown and DOCX exports from generated resume drafts.

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

## State projections

- `document_export.current_status`
- `resume.current_exports`

## Safety boundary

Exports are local records only. The domain does not send email, upload files, submit applications, use browser automation, call Gmail/Calendar, scrape LinkedIn, or call AI providers.

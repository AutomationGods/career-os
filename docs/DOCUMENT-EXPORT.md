# Document Export

Career OS exports generated resume drafts locally as Markdown or DOCX.

## What local-only means

Exports are stored in local Career OS records and downloaded through local API routes.

Career OS does not upload the file to job boards, send it by email, submit an application, call Gmail, call Calendar, automate a browser, scrape LinkedIn, or call an AI provider.

## User flow

1. Verify Profile Facts.
2. Generate a resume on `/resumes`.
3. Confirm the truthfulness guard passes.
4. Click `Export Markdown` or `Export DOCX`.
5. Review the export status, document export ID, local path, and download link.
6. Download and inspect the file manually.

## Warning text

```text
Local export only. Human review required before upload, email, submission, or external use.
```

## Formats

### Markdown

Markdown uses simple headings and bullets for easy review and copy/paste.

### DOCX

DOCX uses simple paragraph-based Office Open XML.

The generated DOCX has:

- no graphics
- no tables
- no custom hidden metadata
- no external relationships
- no unsupported claims beyond the verified resume draft sections

## Blocked claim policy

Exports must not include fake CISSP, Security+, clearance, fake employer history, fake dates, fake metrics, unsupported tools, or other blocked claims.

The export manager blocks exports when draft bullets are not grounded in `sourceFacts` or when blocked claim labels appear in exported bullets.

## API

- `POST /api/documents/export`
- `GET /api/documents/exports`
- `GET /api/documents/exports/:id`
- `GET /api/documents/exports/:id/download`

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

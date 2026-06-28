# Phase 09 — Document Export v1

Document Export v1 creates local-only Markdown and DOCX files from generated resume drafts.

## Implemented

- `POST /api/documents/export` routes export requests through the Command Bus and Orchestrator.
- `DocumentExportManager` handles `document_exports.create_markdown`, `document_exports.create_docx`, `document_exports.get`, and `document_exports.list`.
- Markdown export uses simple headings and bullets.
- DOCX export uses a minimal ATS-friendly Office Open XML package with paragraphs only: no graphics, no tables, and no custom hidden metadata.
- `DocumentExport`, `DocumentVersion`, and `DocumentMetadata` records persist local export metadata and content.
- `document_export.requested`, `document_export.markdown_generated`, `document_export.docx_generated`, `document_export.failed`, `resume.export_markdown_generated`, and `resume.export_docx_generated` events preserve the export trail.
- `document_export.current_status` and `resume.current_exports` state projections track export status.
- `/resumes` includes `Export Markdown` and `Export DOCX` buttons after a truthfulness-guarded resume is generated.
- `/documents` lists local exports for the demo user.

## Exact UI warning

```text
Local export only. Human review required before upload, email, submission, or external use.
```

## Safety contract

Document Export v1 only writes local Career OS records and exposes local download routes.

It does not email, upload, submit, apply, call Gmail, call Calendar, use browser automation, install a Chrome extension, scrape LinkedIn, bypass CAPTCHA, or call an AI provider.

## Data flow

```text
UI/API → Command Bus → Orchestrator → Document Export Domain → Resume draft source → Document Export worker/tool → Event Store → State Store → Snapshot Store → UI Workspace
```

## Storage

- `DocumentExport.url`: local-only pseudo URL like `local://career-os/document-exports/<id>/<filename>`.
- `DocumentVersion.content`: Markdown text or DOCX base64 plus filename, MIME type, checksum, and byte count.
- `DocumentMetadata.metadata`: user/source IDs, `localOnly: true`, `externalActionTaken: false`, checksum, and warning text.

## Local demo

1. Run `npm run dev`.
2. Open `http://localhost:3000/profile-facts` and seed or verify Profile Facts.
3. Open `http://localhost:3000/resumes`.
4. Generate the demo resume.
5. Confirm the truthfulness guard passes.
6. Click `Export Markdown`.
7. Click `Export DOCX`.
8. Confirm each export shows a document export ID, local path, and download link.
9. Download both files.
10. Confirm exported content includes only verified resume sections and excludes CISSP, Security+, clearance, fake employers, fake dates, fake metrics, and unsupported tools.
11. Confirm no email/upload/submit/apply action occurred.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npx prisma validate
git diff --check
git status --short
npm run commit:guard
```

## Non-goals

- PDF export.
- External upload.
- Gmail/Calendar integration.
- Email sending.
- Browser automation.
- Chrome extension.
- Application submission.
- AI rewriting or generation.

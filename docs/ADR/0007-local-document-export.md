# ADR-0007: Use Local-Only Document Export Records

## Status

Accepted

## Context

Career OS can generate truthfulness-guarded resume drafts from verified Profile Facts.

Users now need local Markdown and DOCX files for manual review, but the platform must not introduce external upload, email sending, application submission, browser automation, Gmail/Calendar access, LinkedIn scraping, or AI provider calls.

The existing schema already includes `DocumentExport`, `DocumentVersion`, and `DocumentMetadata`, so the export feature can persist local artifacts without adding external storage or a new file service.

## Decision

Use local-only document export records.

`document_exports.create_markdown` and `document_exports.create_docx` route through UI/API → Command Bus → Orchestrator → Document Export Domain → Worker/Tool → Event Store → State Store → Snapshot Store.

`DocumentExport` stores the export record and a local pseudo URL.

`DocumentVersion.content` stores Markdown text or DOCX base64 content.

`DocumentMetadata.metadata` stores checksum, byte length, MIME type, source resume IDs, `localOnly: true`, `externalActionTaken: false`, and the required warning text.

DOCX generation uses simple paragraph-based Office Open XML with no graphics, no tables, no external relationships, and no custom hidden metadata.

## Consequences

Exports are auditable through document and resume export events.

Downloads are available from local API routes without external storage.

The feature keeps the existing platform architecture and does not bypass the Orchestrator or permission policy.

The database can grow because DOCX content is base64 in JSON; this is acceptable for local MVP exports and should be revisited before high-volume or cloud storage use.

## Alternatives considered

### Write files directly to a local filesystem path

Rejected for v1 because file paths vary by deployment and are harder to test and audit than database-backed local records.

### Add cloud object storage

Rejected because external storage adds credential, privacy, lifecycle, and upload controls that are unnecessary for local MVP export.

### Add a DOCX package dependency

Rejected for v1 because a minimal deterministic OOXML exporter is enough for simple ATS-friendly resumes and avoids dependency/API drift.

### Export for application submission

Rejected because submission-bound exports are a separate approval-gated permission and must wait until application packet and browser/email safety layers are mature.

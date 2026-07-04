# Source Documents Domain

Imports pasted career documents and extracts career claims for downstream Profile Facts.

Status: partial vertical-slice implementation.

Commands:
- `source_documents.import`
- `source_documents.list`
- `source_documents.extract_claims`

Events:
- `source_document.import_started`
- `source_document.imported`
- `source_document.import_failed`
- `source_document.claim_extraction_started`
- `source_document.claim_extracted`
- `source_document.claim_extraction_completed`
- `source_document.claim_extraction_failed`

Projections:
- `source_documents.current`
- `career_claim.current`

Truth rule: pasted resume text is not automatically verified.

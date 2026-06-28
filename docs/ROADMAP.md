# Roadmap

Career OS is the first flagship application on a reusable event-driven automation platform.

## Completed foundation

### Phase 1 — Platform and Career OS scaffold

- Monorepo scaffold.
- Next.js dashboard shell.
- Worker scaffold with BullMQ/Redis.
- Prisma/Postgres schema.
- Domain registry placeholders.
- Initial job collection and classification scaffolds.

### Phase 2 — Job Intelligence and Application Factory scaffold

- Job Intelligence pipeline scaffold.
- Application Packet service scaffold.
- Resume and cover-letter placeholders.
- Relationship dedupe scaffold.
- Daily Mission v2 surfaces.

### Phase 3 — Durable stores

- Prisma-backed Event Store.
- Prisma-backed State Store.
- Prisma-backed Snapshot Store.
- In-memory store implementations preserved for tests.
- Durable job pipeline plumbing through store interfaces.
- Read API routes for events, state projections, and snapshots.

### Phase 4 — Orchestrator and Command Bus

- Shared command contract.
- Command Bus handler registration and execution.
- Orchestrator domain routing and permission placeholder.
- Command lifecycle audit events.
- Job pipeline route converted to command submission.
- Packet and relationship command routes wired through the command boundary.

### Phase 5 — Human approval gates

- Permission policy service for allowed, denied, and approval-required commands.
- Approval Request service with in-memory and Prisma-backed adapters.
- Orchestrator approval checks before command execution.
- Approval lifecycle events and approval API routes.
- Approval Requests UI page with approve/reject/cancel actions and local demo buttons.
- Dev demo routes for allowed, approval-required, and denied commands.
- Trusted mode placeholders remain disabled.

### Phase 6 — Approved command replay

- Approval Replay service rebuilds approved commands from ApprovalRequest records.
- Approved replay routes through Command Bus, Orchestrator, Permission Policy, Domain Manager, Event Store, and State Store.
- Replay lifecycle events and persisted replay status/result fields.
- Idempotency guards prevent completed replays from executing twice.
- `/api/approvals/:id/replay` and `/approvals` replay controls.
- Demo-only `email.send` replay records state without sending email.

### Phase 7 — Resume Factory v1 demo UI

- `POST /api/resumes` runs `resume.generate` through the existing command/orchestration boundary.
- Resume Factory v1 emits deterministic, truthfulness-guarded markdown drafts from verified facts only.
- `/profile-facts` adds a local source-of-truth workspace for verified facts and blocked claims.
- `/resumes` adds a local Splunk / Cribl demo workspace with markdown preview, truthfulness status, keyword alignment, and safety warnings.
- CISSP, Security+, clearance, fake employers, and fake metrics remain unclaimed unless verified in Profile Facts and guard-approved.

### Phase 8 — Master Resume Import v1

- `/master-resume` imports pasted plain-text resume content.
- `master_resume.import` stores the current import, captures `master_resume.source_text`, and emits parser events.
- Candidate facts are created as `needs_review`, `sourceType: resume_import`, and `allowedInResume: false`.
- `profile_facts.review_queue` surfaces facts awaiting verification or blocking.
- Resume Factory ignores needs-review import facts and continues to use verified Profile Facts only.

### Phase 9 — Resume Factory v2

- `/resumes` supports template selection and section ordering.
- `GET /api/resume-templates` lists the ATS-friendly template catalog.
- `resume.generate` writes `ResumeVersion` records with template and review-checklist metadata.
- `resume.template_selected` and `resume.review_checklist_created` events preserve draft evidence.
- Draft bullets still exactly match verified facts only; blocked claims appear as not claimed.

### Phase 9 — Document Export v1

- `/resumes` exports generated resume drafts as local Markdown and DOCX.
- `/documents` lists local exports.
- `document_exports.create_markdown` and `document_exports.create_docx` route through Command Bus, Orchestrator, and Document Export Domain.
- `DocumentExport`, `DocumentVersion`, and `DocumentMetadata` store local content, checksums, and source IDs.
- `document_export.current_status` and `resume.current_exports` projections track export status.
- Exported content remains grounded in verified draft bullets and excludes blocked claims.

### Phase 10 — Persisted Job Discovery v1

- `/jobs` imports pasted/manual job data only.
- `jobs.import_manual_url`, `jobs.list`, and `jobs.get` route through Command Bus and Orchestrator.
- `JobStore` persists canonical jobs plus sources, snapshots, segments, fit scores, and difficulty scores.
- Existing `jobs.run_pipeline` can persist when a `JobStore` is injected.
- Application Packets and Resume Factory can hydrate from a persisted `jobId`.
- URL fetching, crawling, scraping, browser automation, upload, submission, email, Gmail, Calendar, LinkedIn scraping, AI provider calls, and auto-apply remain excluded.

## Next recommended foundation work

Build persisted Application Packet records and attach generated documents to durable application workflows.

## Explicitly deferred

Do not implement these until the foundation is stable and approval gates are enforced:

- Gmail sync
- Google Calendar sync
- email sending
- Chrome extension
- browser autofill
- auto-submit
- LinkedIn scraping
- proxy scraping
- CAPTCHA bypassing
- full AI resume generation

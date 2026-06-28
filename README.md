# Career OS

Career OS is the first flagship implementation of a reusable event-driven automation platform.

The platform layer provides the System Kernel, Domain Registry, Command Bus, Event Store, State Store, Snapshot Store, orchestration, configuration, security, trust and safety, scheduling, notifications, integrations, AI, reasoning, knowledge, memory, observability, QA, recovery, workflow, and mission primitives.

Career OS runs on that platform as a career-management product for job intelligence, application packets, relationships, documents, interviews, follow-ups, and career growth.

## Architecture

Every domain follows:

```text
Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace
```

The platform is designed so future products such as Sales OS, Grant OS, Real Estate OS, Recruiting OS, Client Acquisition OS, Agency Operations OS, Compliance OS, and Healthcare Operations OS can reuse the same architecture later.

## Phase 1 foundation

- Next.js dashboard shell with workspaces for missions, jobs, applications, relationships, documents, follow-ups, settings, health, and domain registry.
- Worker app scaffold using BullMQ and Redis.
- Prisma/Postgres schema covering events, state, snapshots, companies, jobs, applications, documents, people, email, calendar, follow-up, and intelligence records.
- Domain registry and placeholders for required domains.
- Greenhouse and Lever collectors, Ashby placeholder, manual URL importer, job normalization, remote classification, clearance segmentation, and basic fit scoring.

## Phase 2 foundation

- Job Intelligence pipeline scaffold.
- Application Packet service scaffold.
- Resume and cover-letter placeholder generation.
- Relationship dedupe scaffold.
- Daily Mission v2 surfaces.
- API route scaffolds for pipeline, packets, relationships, and mission data.

## Phase 3 durable stores

- Prisma-backed Event Store for permanent event history.
- Prisma-backed State Store for current truth projections.
- Prisma-backed Snapshot Store for point-in-time source data with checksums.
- In-memory store implementations preserved for tests and lightweight local usage.
- Read API routes for `/api/events`, `/api/state`, and `/api/snapshots`.

## Phase 4 command execution

- Shared `CareerCommand` and `CommandResult` contracts.
- Command Bus for handler registration and command execution.
- Orchestrator for registry-backed domain routing and command lifecycle audit events.
- Job pipeline, application packet, and relationship dedupe API routes submit commands instead of calling services directly.

## Phase 5 human approval gates

- Permission policy service returns allowed, denied, or requires-approval decisions.
- Sensitive commands create approval requests instead of executing automatically.
- Approval lifecycle events preserve audit history.
- Approval API routes and a basic `/approvals` page expose pending and decided requests.
- `/approvals` includes local demo buttons for allowed, approval-required, and denied commands.
- Dev demo routes under `/api/dev/commands/*` exercise policy without sending email, using a browser, uploading files, or submitting applications.
- Trusted mode placeholders remain disabled.

## Phase 6 approved command replay

- Approved requests can be replayed through Approval Service → Command Bus → Orchestrator → Permission Policy → Domain Manager.
- Replay status and results are persisted on the approval request.
- Completed replay is idempotent and returns the stored result on repeat clicks.
- Local `email.send` replay is demo-only and records `externalActionTaken: false`.
- Denied `application.auto_submit` commands remain non-replayable.

## Phase 7 Resume Factory v1

- Resume Factory v1 generates truthfulness-guarded resume drafts from supplied verified facts only.
- `POST /api/resumes` routes through the Command Bus, Orchestrator, Resume Factory Domain, Event Store, State Store, and Snapshot Store.
- `/profile-facts` provides a local source-of-truth workspace for verified facts and blocked claims.
- `/resumes` provides a local demo workspace with a Splunk / Cribl Platform Engineer payload, markdown preview, truthfulness status, keyword alignment, and safety warnings.
- CISSP, Security+, clearance, fake employers, and fake metrics remain unclaimed unless verified Profile Facts allow them and the guard passes.

## Phase 8 Master Resume Import v1

- `/master-resume` accepts pasted plain-text resume content.
- `POST /api/master-resume/import` stores the import, captures a source snapshot, parses deterministic candidate facts, and creates needs-review Profile Facts.
- Imported facts start with `allowedInResume: false` until the user verifies them.
- Blocked CISSP, Security+, and clearance claims shadow duplicate candidates.
- Resume Factory continues to use verified Profile Facts only.

## Phase 9 Resume Factory v2

- `/resumes` now includes template selection, section-order controls, review checklist cards, and a structured ATS-friendly preview.
- `GET /api/resume-templates` lists available templates.
- `POST /api/resumes` accepts `templateKey`, `sectionOrder`, and optional `masterResumeId`.
- Generated drafts persist to `ResumeVersion` with template metadata and checklist content.
- Section bullets still copy verified facts exactly; needs-review and blocked claims are not claimed.

## Phase 9 Document Export v1

- `/resumes` can export generated resume drafts as local Markdown and DOCX.
- `/documents` lists local document exports for review and download.
- `POST /api/documents/export` routes through Command Bus, Orchestrator, and Document Export Domain.
- Export records use `DocumentExport`, `DocumentVersion`, and `DocumentMetadata` with local-only content and checksums.
- Required warning: `Local export only. Human review required before upload, email, submission, or external use.`
- No email, upload, submission, browser automation, Gmail, Calendar, LinkedIn scraping, or AI provider call is performed.

## Resume Factory local demo

```bash
npm run dev
```

Then open `http://localhost:3000/master-resume`, click `Import + Safety Blocks`, verify one Splunk/Cribl fact, open `http://localhost:3000/profile-facts`, confirm the source-of-truth state, open `http://localhost:3000/resumes`, and click `Generate Demo Splunk/Cribl Resume`.

Confirm the preview appears, truthfulness status appears, verified Profile Facts are used, needs-review facts are ignored, CISSP/Security+/clearance remain blocked, export Markdown and DOCX locally, and confirm no email/upload/submit/apply action happened.

## Safety rules

Career OS requires human approval before sending emails, submitting applications, answering sensitive questions, contacting recruiters for the first time, modifying the master profile, exporting AI-generated documents for real use, or uploading files to unknown sites.

LinkedIn scraping, CAPTCHA bypassing, proxy scraping, email sending, browser automation, and auto-submit are intentionally excluded from the current foundation.

## Governance docs

- `docs/ARCHITECTURE_BIBLE.md`
- `docs/CONSTITUTION.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/ADR/0001-domain-architecture.md`
- `docs/ADR/0002-event-state-snapshot-stores.md`
- `docs/PHASE-03-DURABLE-STORES.md`
- `docs/PHASE-04-ORCHESTRATOR-COMMAND-BUS.md`
- `docs/PHASE-05-HUMAN-APPROVAL-GATES.md`
- `docs/PHASE-06-APPROVED-COMMAND-REPLAY.md`
- `docs/PHASE-07-RESUME-FACTORY-V1.md`
- `docs/PHASE-08-MASTER-RESUME-IMPORT-V1.md`
- `docs/PHASE-09-RESUME-FACTORY-V2.md`
- `docs/PHASE-09-DOCUMENT-EXPORT-V1.md`
- `docs/DOCUMENT-EXPORT.md`
- `docs/RESUME-FACTORY-DEMO.md`
- `docs/ADR/0003-command-bus-orchestrator.md`
- `docs/ADR/0004-human-approval-gates.md`
- `docs/ADR/0005-approved-command-replay-idempotency.md`
- `docs/ADR/0007-local-document-export.md`

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm test
npx prisma validate
git diff --check
git status --short
```

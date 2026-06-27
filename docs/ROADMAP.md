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

## Next recommended foundation work

Add durable replay queue workers and operator-visible replay audit history without enabling external actions.

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

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
- Basic Approval Requests UI page.
- Trusted mode placeholders remain disabled.

## Next recommended foundation work

Implement resumable approved-command execution and connect approval decisions to queued command replay.

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

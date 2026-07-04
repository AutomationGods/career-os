# Career OS

Career OS is the first flagship implementation of a reusable event-driven automation platform.

The platform layer provides the System Kernel, Domain Registry, Command Bus, Event Store, State Store, Snapshot Store, orchestration, configuration, security, trust and safety, scheduling, notifications, integrations, AI, reasoning, knowledge, memory, observability, QA, recovery, workflow, and mission primitives.

Career OS runs on that platform as an agentic career operating system for turning resumes, documents, verified profile facts, job discovery, fit scoring, application packets, recruiter relationships, interviews, follow-ups, and daily missions into one coordinated job-search pipeline.

## Working MVP

Open `/job-discovery` and click **Find Jobs** to search selected public job sources, preserve source links, enforce your keyword locally, score jobs through the existing pipeline, and start application packets from `/job-pipeline-results`.

The safe/manual workflow is: **Find Jobs → Score/Review → Create Packet → Generate Grounded Resume → Review/Export Locally → Track Status/Follow-Up**.

Packet detail pages generate truthfulness-guarded resume drafts from resume-allowed Profile Facts, export local markdown downloads, and move packets through manual review/follow-up statuses.

Gmail read-only sync, Gmail sending, recruiter outreach, browser automation, uploads, auto-apply, LinkedIn scraping, proxy scraping, and CAPTCHA bypassing remain disabled or future approval-gated integrations.

## Docker Desktop production-style start

```bash
cp .env.example .env
npx workos auth login
npx workos config redirect add http://localhost:3000/auth/callback
npx workos config homepage-url set http://localhost:3000
npx workos config cors add http://localhost:3000
# Copy WORKOS_API_KEY and WORKOS_CLIENT_ID from the active WorkOS CLI environment or dashboard into .env.
docker compose up --build
```

Open `http://localhost:3000`.

Docker starts Postgres, Redis, runs `prisma migrate deploy`, then starts the Next.js web app with `CAREER_OS_COMMAND_RUNTIME=prisma`.

The checked-in WorkOS placeholder values wire AuthKit into the app, but hosted login will only complete after replacing them with real WorkOS values. Compose reads `WORKOS_*` values from `.env` when present and falls back to placeholders otherwise.

Local demo seed/dev routes stay disabled in this Docker flow; set `CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES=true` only for local development demos.

## Hermes Agent integration

Career OS runs on top of Hermes Agent as a Docker Compose sidecar: browser → Career OS auth/policies/API routes → `http://hermes:8642` inside the Compose network.

Keep this server-to-server only: browsers never call Hermes directly, no browser CORS is needed, and `HERMES_AGENT_API_KEY` must stay server-only.

### Docker Compose Hermes setup

1. Create Hermes' persistent data directory:

```bash
mkdir -p ~/.hermes
```

2. Generate a bearer key and add it to `.env`:

```bash
openssl rand -hex 32
```

```bash
HERMES_AGENT_ENABLED="true"
HERMES_AGENT_API_BASE_URL="http://127.0.0.1:8642"
HERMES_AGENT_API_KEY="<generated-secret>"
HERMES_AGENT_MODEL="hermes-agent"
HERMES_AGENT_TIMEOUT_MS="60000"
HERMES_AGENT_HOST_PORT=8642
```

3. Start the Hermes sidecar:

```bash
docker compose up -d hermes
```

4. Verify Hermes directly from the host:

```bash
curl http://127.0.0.1:8642/v1/capabilities \
  -H "Authorization: Bearer <generated-secret>"
```

5. For model/tool use, run Hermes setup once against the same persisted volume:

```bash
docker compose run --rm hermes setup
# or: docker compose run --rm hermes setup --portal
```

The `web` container receives `HERMES_AGENT_API_BASE_URL=http://hermes:8642`, while host tools can use `http://127.0.0.1:8642`.

### Career OS verification

Open `http://localhost:${WEB_HOST_PORT:-3000}/system-health` after signing in to see the Hermes status card.

For a shell-level container check that does not need browser auth:

```bash
docker compose exec web node - <<'NODE'
const response = await fetch(`${process.env.HERMES_AGENT_API_BASE_URL}/v1/health`, {
  headers: { Authorization: `Bearer ${process.env.HERMES_AGENT_API_KEY}` }
});
console.log(response.status, await response.text());
NODE
```

The Hermes health and responses API routes require Career OS authentication; local development can use `CAREER_OS_AUTH_DISABLED="true"`.

## Product model

Career OS is not a resume builder. A resume is one artifact inside a larger career pursuit pipeline.

Start with `docs/product/README.md` for the product thesis, resume-to-career-profile process, core pipeline, goals/non-goals, north star, and full operating process.

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

- Resume Factory v1 generates truthfulness-guarded resume drafts from resume-allowed Profile Facts only.
- `POST /api/resumes` routes through the Command Bus, Orchestrator, Resume Factory Domain, Event Store, State Store, and Snapshot Store.
- `/resumes` provides a local demo workspace with a Splunk / Cribl Platform Engineer payload, markdown preview, truthfulness status, keyword alignment, and safety warnings.
- CISSP, Security+, clearance, fake employers, and fake metrics remain unclaimed unless they are resume-allowed Profile Facts and pass the guard.

## Phase 8 Job Discovery MVP

- `job_discovery.search` routes through the Command Bus and Orchestrator.
- Remotive, Remote OK, and Arbeitnow public API results are normalized, attributed, keyword-filtered, snapshotted, scored, and segmented.
- `/job-discovery` runs searches and `/job-pipeline-results` shows source links before packet creation.
- External sends, uploads, browser actions, and application submission remain disabled.

## Phase 9 Safe Manual Application Workflow

- State projections are user-scoped, so two users can import the same public Remotive job ID without collisions.
- Packet detail pages generate packet-specific grounded resumes through `resume.generate` using resume-allowed Profile Facts only.
- `documents.export` records local markdown export metadata and returns a local `.md` download; it does not upload, submit, send, or contact anyone.
- `application_packets.update_status` moves packets through manual review, ready-to-apply, follow-up due, and closed states.
- Fit scoring shows matched keywords, missing keywords, and a scoring reason.

## Resume Factory local demo

```bash
npm run dev
```

Then open `http://localhost:3000/resumes` and click `Generate Demo Splunk/Cribl Resume`.

Confirm the preview appears, truthfulness status appears, CISSP/Security+/clearance are not invented, and no email/upload/submit/apply action happened.

## Safety rules

Career OS requires human approval before sending emails, submitting applications, answering sensitive questions, contacting recruiters for the first time, modifying the master profile, exporting documents for external submission, or uploading files to unknown sites.

Local markdown export is allowed because it stays on your machine and records an audit event.

LinkedIn scraping, CAPTCHA bypassing, proxy scraping, email sending, browser automation, recruiter outreach, and auto-submit are intentionally excluded from the current foundation.

## Governance docs

- `docs/product/README.md`
- `docs/USING-CAREER-OS-TODAY.md`
- `docs/ARCHITECTURE_BIBLE.md`
- `docs/CONSTITUTION.md`
- `docs/DEVELOPER_GUIDE.md`
- `docs/ENTERPRISE_READINESS.md`
- `docs/ADR/0001-domain-architecture.md`
- `docs/ADR/0002-event-state-snapshot-stores.md`
- `docs/PHASE-03-DURABLE-STORES.md`
- `docs/PHASE-04-ORCHESTRATOR-COMMAND-BUS.md`
- `docs/PHASE-05-HUMAN-APPROVAL-GATES.md`
- `docs/PHASE-06-APPROVED-COMMAND-REPLAY.md`
- `docs/PHASE-07-RESUME-FACTORY-V1.md`
- `docs/RESUME-FACTORY-DEMO.md`
- `docs/ADR/0003-command-bus-orchestrator.md`
- `docs/ADR/0004-human-approval-gates.md`
- `docs/ADR/0005-approved-command-replay-idempotency.md`

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

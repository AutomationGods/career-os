# Using Career OS Today

This guide documents the functionality that is intended to work in the app right now.

It is written for local use and product review, not for real job applications.

## Recommended local demo mode

Use this mode when you want to see the core Career OS data-flow demo without configuring WorkOS, Redis, email, browser automation, or AI providers.

Local-memory mode now supports the full **Find Jobs → Score/Review → Create Packet → Generate Grounded Resume → Review/Export Locally → Track Status/Follow-Up** browser flow by sharing in-memory stores across route/page workers.

```bash
npm install
CAREER_OS_AUTH_DISABLED=true \
CAREER_OS_AUTH_DISABLED_USER_ID=user-demo-local \
CAREER_OS_COMMAND_RUNTIME=local-memory \
CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES=true \
npm run dev
```

Open:

```text
http://localhost:3000
```

### Local demo assumptions

- Auth is bypassed for local development only.
- Job, packet, resume, relationship, event, state, and snapshot demo data is stored in memory and resets when the dev server restarts.
- Persisted approval-record management uses the Prisma/Postgres-backed approval store.
- Demo routes are enabled only because `CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES=true` is set.
- No email is sent.
- No application is submitted.
- No browser automation runs.
- No LinkedIn scraping, CAPTCHA bypassing, proxy scraping, document upload, or external apply action runs.
- Resume output is a local-review draft only.

## Durable local / Docker mode

Use this mode when you want the Prisma/Postgres-backed runtime.

```bash
cp .env.example .env
npx workos auth login
npx workos config redirect add http://localhost:3000/auth/callback
npx workos config homepage-url set http://localhost:3000
npx workos config cors add http://localhost:3000
# Copy WORKOS_API_KEY and WORKOS_CLIENT_ID into .env.
docker compose up --build
```

Open:

```text
http://localhost:3000
```

### Durable mode assumptions

- Docker starts Postgres, Redis, migrations, and the Next.js web app.
- The app runs with `CAREER_OS_COMMAND_RUNTIME=prisma`.
- Real WorkOS values are required for hosted login to complete.
- Local demo routes stay disabled unless you intentionally set `CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES=true` for local development.

## Current product flow

The homepage is organized around the working candidate workflow:

```text
Find Jobs → Score/Review → Create Packet → Generate Grounded Resume → Review/Export Locally → Track Status/Follow-Up
```

Use the left sidebar in this order.

The lower **Workspaces + admin** links expose diagnostics and optional local demo seeding.

## 1. Find Jobs

Open:

```text
http://localhost:3000/job-discovery
```

Working functionality:

- searches selected public job APIs through `job_discovery.search`: All public sources, Remotive, Remote OK, or Arbeitnow
- defaults the query to `Splunk Cribl SIEM Terraform AWS DevOps remote`
- defaults the source to `all`
- defaults the limit to `20` and caps it at `50`
- preserves the original source job URL
- shows source attribution
- applies the query keywords locally before importing jobs
- captures the source response snapshot
- normalizes, scores, and segments every imported job through `jobs.run_pipeline`
- writes `job.discovery_run` and `job.dashboard_segment` state projections

API-backed command:

```text
POST /api/job-discovery/search
```

Public source requirements for this app:

- Link back to the URL returned by the source.
- Mention the source name on job results.
- Keep requests light.
- Do not submit source listings to third-party job boards.

## 2. Pick a Job

Open:

```text
http://localhost:3000/job-pipeline-results
```

This page reads job dashboard state projections.

Working functionality:

- shows normalized job title/company/location
- shows public source attribution when present
- links to the original job listing when present
- shows dashboard segment
- shows remote classification
- shows fit score
- shows matched keywords, missing keywords, and scoring reason
- shows application difficulty
- starts an application packet from a selected job
- opens the existing packet when one already exists for that job

API-backed command:

```text
POST /api/jobs/:id/run-pipeline
```

The route submits `jobs.run_pipeline` through the command runtime.

## 3. Application Packets

Open:

```text
http://localhost:3000/application-packets
```

Working functionality:

- lists current application packets
- groups counts by packet status
- opens packet detail pages
- connects selected job, company, recruiter, fit summary, notes, status, and next action

Packet detail:

```text
http://localhost:3000/application-packets/:id
```

Packet detail shows:

- selected job
- company
- packet status
- fit score and segment
- recruiter name/email when present
- next action
- packet-specific grounded resume generation from verified facts
- latest generated resume draft and local markdown export link
- manual status controls for awaiting review, ready to apply manually, follow-up due, and closed
- generated resume, cover letter, and recruiter message placeholders
- notes

API-backed commands/routes:

```text
GET  /api/application-packets
POST /api/application-packets
POST /api/application-packets/:id/generate-placeholders
POST /api/application-packets/:id/status
GET  /api/application-packets/:id/resume/export
```

These routes submit packet creation, placeholder generation, manual status updates, and local export metadata through the command runtime. Local export returns markdown only; it does not upload, submit, send, or contact anyone.

## 4. Resume Factory

Default to packet detail pages for real draft generation:

```text
http://localhost:3000/application-packets/:id
```

The `/resumes` page remains a secondary demo generator.

Working functionality:

- generates packet-specific or demo local resume drafts
- posts to `POST /api/resumes`
- routes through `resume.generate`
- uses supplied verified facts only
- shows command status
- shows resume version ID and draft ID
- shows source snapshot ID when available
- shows keyword alignment
- shows truthfulness guard status
- shows blocked claims, warnings, grounded claims, and resume preview

Expected safe behavior:

- Splunk, Cribl, SIEM, Linux, Terraform, AWS, Azure, and GCP can appear when supplied as verified facts.
- CISSP and Security+ stay missing/preferred unless supplied as verified facts.
- Clearance-sensitive claims stay blocked unless supplied and guard-approved.
- Local markdown export can happen only from packet detail after draft generation.
- No email, upload, submit, apply, recruiter contact, or external action happens.

API-backed command:

```text
POST /api/resumes
```

## 5. Approval Requests

Open:

```text
http://localhost:3000/approvals
```

Working functionality for persisted approval records:

- lists approval requests for the current user
- shows pending/approved/rejected/cancelled counts
- approves pending requests
- rejects pending requests
- cancels pending requests
- replays approved requests through the approval replay path
- treats completed replay as idempotent

In local demo mode, the page also shows three policy demo buttons:

- **Run Allowed Command** — runs safe `jobs.run_pipeline` demo data.
- **Run Approval-Gated Command** — exercises `email.send` approval policy without sending email.
- **Run Denied Command** — submits `application.auto_submit` demo data that policy rejects.

Current assumption: the local policy demo buttons are for seeing allowed / approval-gated / denied command results in the page’s **Latest results** cards. If the persisted approval store is unavailable, the latest command result can still show the policy outcome while approval-list refresh may report a refresh error. Approve, reject, cancel, and replay controls apply to approval records that are present in the persisted approval list.

API-backed routes:

```text
GET  /api/approvals
GET  /api/approvals/:id
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
POST /api/approvals/:id/cancel
POST /api/approvals/:id/replay
```

Local demo routes, enabled only when `CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES=true`:

```text
POST /api/dev/commands/allowed
POST /api/dev/commands/requires-approval
POST /api/dev/commands/denied
```

## 6. Relationships and follow-up

Open:

```text
http://localhost:3000/relationships
```

Working functionality:

- lists deduped people records
- groups people by role
- opens relationship detail pages
- shows next follow-up timestamps when present

Relationship detail:

```text
http://localhost:3000/relationships/:id
```

Relationship detail shows:

- person name
- company
- roles
- relevance/responsiveness/trust scores
- last contact time
- next follow-up time
- email and phone contact points
- relationship event audit trail
- relationship state projections

Current follow-up behavior is read/review only. It does not send recruiter outreach.

## 7. System Health

Open:

```text
http://localhost:3000/system-health
```

Working functionality:

- shows registered domain manager count
- shows command handler count
- shows event count
- shows state projection count
- shows snapshot count
- shows pending approval count
- shows implemented and command-backed manager coverage
- lists domain manager readiness

Use this page when you need to confirm that the platform plumbing is visible.

## 8. Platform Operations and data touchpoints

Open:

```text
http://localhost:3000/#admin-domain-registry
```

Working functionality:

- shows runtime counts for events, state projections, and snapshots
- links to system health and approval audit
- shows **Working Data Flow** local demo panel when demo routes are enabled
- collapses the full Domain Registry behind **Show Domain Registry**

The Working Data Flow panel is still available for demo records, but the primary job-search path now starts at **Find Jobs**.

## What is intentionally not working yet

These are intentionally deferred or blocked in the current foundation:

- real email sending
- Gmail read-only sync and Gmail sending
- Google Calendar sync
- recruiter outreach
- Chrome extension behavior
- browser autofill
- automatic application submission
- LinkedIn scraping
- proxy scraping
- CAPTCHA bypassing
- document upload to external sites
- export for external submission
- full AI-provider resume generation

## Daily usage checklist

For the working MVP:

1. Start the dev server with auth disabled and `CAREER_OS_COMMAND_RUNTIME=local-memory`.
2. Open `http://localhost:3000`.
3. Open **Find Jobs**.
4. Search `Splunk Cribl SIEM Terraform AWS remote` with limit `5`.
5. Open **Job Pipeline Results**.
6. Confirm real jobs show source attribution, original URLs, matched keywords, and missing keywords.
7. Open or create the application packet.
8. Generate the packet-specific grounded resume from verified facts on packet detail.
9. Export the local markdown draft.
10. Move packet status through review/follow-up/closed manually.
11. Confirm no email, Gmail send, upload, browser automation, recruiter contact, or application submit happened.
12. Open **System Health** to confirm event/state/snapshot counts.

## Safety rule for today

Use Career OS as a local command center and review surface.

Treat every generated draft as review-only; local markdown export is safe, while send, upload, recruiter outreach, and submit workflows remain future approval-gated integrations.

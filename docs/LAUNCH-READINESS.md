# Launch Readiness Gates

Career OS is **A++ launch-ready** for the manual-safe MVP apply loop as of 2026-06-29.

Verified launch loop:

`Jobs → Application Packets → Profile Facts / Master Resume → Resume Factory → Documents → manual status tracking`

Placeholder domains remain roadmap inventory. They are hidden from production product surfaces unless explicitly enabled for internal demos.

## Verification summary

| Gate | Status | Evidence |
| --- | --- | --- |
| Auth + tenancy | PASS | Auth.js wiring, protected middleware, `requireUser`, and route/store ownership tests. |
| Production route exposure | PASS | `/api/dev/**` production gates, production-hidden approval demos, placeholder flags. |
| Database migrations | PASS | Baseline + auth/tenancy migrations; `prisma migrate deploy` passed on clean DB `career_os_migrate_check_1782712994`. |
| Runtime config + secrets | PASS | Zod-backed env validation rejects missing/placeholder production secrets. |
| Security hardening | PASS | Security headers, same-origin mutation checks, rate limits, request-size guards, normalized errors, dependency audit. |
| Privacy controls | PASS | `/settings`, `/api/privacy/export`, `/api/privacy/delete`, privacy service, privacy runbooks/checklist. |
| Product-surface honesty | PASS | Default navigation exposes only launch MVP surfaces; future modules are gated/coming-later. |
| Operations readiness | PASS | Health/readiness endpoints, Dockerfile, Compose healthchecks, worker queue contract, runbooks. |
| CI and release gates | PASS | CI workflow plus local `npm run commit:guard` passed. |

## Gate 1: Authentication

| Check | Status | Evidence |
| --- | --- | --- |
| Anonymous app routes redirect to sign-in or return 401. | PASS | `apps/web/middleware.ts`; authenticated page helpers in `apps/web/app/_lib/page-auth.ts`. |
| Anonymous API requests return 401 unless the route is explicitly public. | PASS | Shared `requireUser` in `apps/web/app/api/_lib/session.ts`; launch API route tests. |
| Auth callback routes are the only public auth endpoints. | PASS | `apps/web/auth.ts`; `apps/web/app/api/auth/[...nextauth]/route.ts`. |
| Production auth secrets are present and not `change-me`. | PASS | `packages/config/src/index.ts` production-secret validation. |

## Gate 2: Tenancy and user-owned data

| Check | Status | Evidence |
| --- | --- | --- |
| API handlers ignore caller-provided `userId`. | PASS | Jobs, packets, profile facts, master resume, resumes, documents, approvals handlers use session `userId`. |
| Jobs are listed, read, updated, and deleted only for the owner. | PASS | `apps/web/app/api/jobs/__tests__/job-routes.test.ts`; `packages/domains/src/job-discovery/__tests__/job-store.test.ts`. |
| Application packets are scoped to the owner through `Application.userId`. | PASS | `apps/web/app/api/application-packets/__tests__/application-packet-routes.test.ts`; packet flow tests. |
| Profile facts and master resumes are scoped to the owner. | PASS | `apps/web/app/api/master-resume/__tests__/master-resume-routes.test.ts`; identity service tests. |
| Resume versions and document exports are scoped to the owner. | PASS | `apps/web/app/api/resumes/__tests__/resume-routes.test.ts`; `apps/web/app/api/documents/__tests__/document-export-routes.test.ts`. |
| Events, state projections, and snapshots cannot be globally listed by normal users. | PASS | Store-level user filters in `packages/events`, `packages/state`, `packages/snapshots`; ownership-hardening tests. |
| Privacy export/delete cannot access another user's data. | PASS | `packages/domains/src/privacy/privacy-service.ts`; authenticated privacy endpoints. |

## Gate 3: Production route exposure

| Check | Status | Evidence |
| --- | --- | --- |
| `/api/dev/**` is blocked in production. | PASS | `apps/web/app/api/dev/commands/_handlers.ts`; `dev-command-routes.test.ts`. |
| Approval demo controls are hidden in production. | PASS | `apps/web/app/approvals/page.tsx`; `ApprovalTestPanel` gating. |
| Placeholder domains are hidden unless `ENABLE_PLACEHOLDER_DOMAINS=true`. | PASS | `packages/config/src/index.ts`; dashboard and route copy updates. |
| External collectors are disabled unless `ENABLE_EXTERNAL_COLLECTORS=true`. | PASS | Config flag defaults to false and is documented in `.env.example`. |
| Production demo data is disabled unless `ENABLE_PRODUCTION_DEMO_DATA=true`. | PASS | Explicit `prisma:seed`; no production startup seed path. |

## Gate 4: Database migrations

| Check | Status | Evidence |
| --- | --- | --- |
| Current schema has a baseline Prisma migration. | PASS | `prisma/migrations/20260629000100_baseline/migration.sql`. |
| Auth.js and tenancy schema changes are migration-backed. | PASS | `prisma/migrations/20260629000200_auth_tenancy/migration.sql`. |
| `npx prisma migrate deploy` succeeds on a clean database. | PASS | `DATABASE_URL=.../career_os_migrate_check_1782712994 npm run prisma:deploy` passed. |
| Demo seed data only runs through explicit seed command. | PASS | `prisma/seed.ts`; root `prisma:seed` script. |

## Gate 5: Runtime configuration and secrets

| Check | Status | Evidence |
| --- | --- | --- |
| Server env is Zod-validated at boot. | PASS | `packages/config/src/index.ts`. |
| Client env is separated from server-only secrets. | PASS | `getClientConfig` and server-only config exports. |
| Production rejects missing or placeholder secrets. | PASS | Production validation for `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `REDIS_URL`, origins, auth allowlist. |
| Allowed origins are configured and validated. | PASS | `ALLOWED_ORIGINS` parsing and same-origin mutation helper. |

## Gate 6: Security hardening

| Check | Status | Evidence |
| --- | --- | --- |
| Security headers are applied to all app responses. | PASS | `apps/web/middleware.ts`. |
| Mutation routes enforce same-origin requests. | PASS | `assertSameOriginMutation` in `apps/web/app/api/_lib/session.ts`. |
| Mutation/auth-sensitive routes are rate-limited. | PASS | `apps/web/app/api/_lib/rate-limit.ts`; route handler integrations. |
| Pasted job/resume/document endpoints enforce request-size limits. | PASS | `readJsonWithLimit` / body-size guards in shared response/session helpers and launch handlers. |
| API errors are normalized and avoid stack/Prisma leakage. | PASS | `apps/web/app/api/_lib/responses.ts`. |
| Dependency audit is part of CI and local guard. | PASS | `npm run audit:deps`; `.github/workflows/ci.yml`; `npm run commit:guard` passed. |

## Gate 7: Privacy controls

| Check | Status | Evidence |
| --- | --- | --- |
| User data export endpoint includes launch-domain data. | PASS | `apps/web/app/api/privacy/export/route.ts`; `packages/domains/src/privacy/privacy-service.ts`. |
| User deletion or deletion-request endpoint exists. | PASS | `apps/web/app/api/privacy/delete/route.ts`. |
| Settings page exposes privacy controls. | PASS | `apps/web/app/settings/page.tsx`; `PrivacyControls.tsx`. |
| Data retention policy is documented. | PASS | `docs/PRIVACY-LAUNCH-CHECKLIST.md`; `docs/PRIVACY-RUNBOOK.md`. |
| Legal document placeholders are marked lawyer-review required. | PASS | `docs/PRIVACY-LAUNCH-CHECKLIST.md`. |

## Gate 8: Product-surface honesty

| Check | Status | Evidence |
| --- | --- | --- |
| Default signed-in navigation shows only launch MVP surfaces. | PASS | `apps/web/app/layout.tsx`; launch pages. |
| Future modules are presented as coming later, not shipped features. | PASS | `apps/web/app/page.tsx`; placeholder route copy updates. |
| Launch pages have empty/loading/error states. | PASS | Jobs, packets, profile facts, master resume, resumes, documents, approvals pages. |
| Public landing page accurately describes manual-safe MVP behavior. | PASS | `apps/web/app/page.tsx`. |

## Gate 9: Operations readiness

| Check | Status | Evidence |
| --- | --- | --- |
| `/api/health` returns process health without dependency calls. | PASS | `apps/web/app/api/health/route.ts`; Compose smoke returned `status: ok`. |
| `/api/ready` checks database and Redis. | PASS | `apps/web/app/api/ready/route.ts`; Compose smoke returned database/redis `ok`. |
| Web and worker images have Dockerfiles and health checks. | PASS | `Dockerfile`; `docker-compose.yml`; `docker compose build web` passed. |
| Compose has Postgres and Redis healthchecks. | PASS | `docker-compose.yml`; Postgres and Redis showed `healthy`. |
| Worker either processes a real queue contract or is removed from launch scope. | PASS | `apps/worker/src/index.ts` processes launch queue contract with BullMQ. |
| Deployment, backup/restore, incident, and privacy runbooks exist. | PASS | `docs/DEPLOYMENT.md`; `docs/BACKUP-RESTORE-RUNBOOK.md`; `docs/INCIDENT-RUNBOOK.md`; `docs/PRIVACY-RUNBOOK.md`; `docs/RUNBOOK.md`. |

## Gate 10: CI and release gate

| Check | Status | Evidence |
| --- | --- | --- |
| CI runs lint, typecheck, tests, Prisma validate, build, and dependency audit. | PASS | `.github/workflows/ci.yml`. |
| Authenticated MVP happy path is tested. | PASS | `apps/web/app/api/__tests__/authenticated-mvp-happy-path.test.ts`. |
| Cross-user access tests exist for launch domains. | PASS | Route tests plus `packages/domains/src/__tests__/ownership-hardening.test.ts`. |
| Production gating tests exist. | PASS | `apps/web/app/api/dev/commands/__tests__/dev-command-routes.test.ts`; approval route tests. |
| Final `npm run commit:guard` passes. | PASS | `NEXTAUTH_SECRET=... NEXTAUTH_URL=... ALLOWED_ORIGINS=... npm run commit:guard` passed: Prisma validate, typecheck, lint, 101 test files / 208 tests, build, dependency audit. |

## Final launch rule

Career OS is marked **A++ public-launch ready** for the manual-safe MVP apply loop.

Keep the production launch blocked until real provider credentials, production database/Redis URLs, lawyer-reviewed legal documents, backups, and monitoring endpoints are configured in the deployment environment.

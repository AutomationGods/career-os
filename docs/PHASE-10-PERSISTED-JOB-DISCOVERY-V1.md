# Phase 10 — Persisted Job Discovery v1

## Summary

Career OS now supports manual-only persisted job discovery.

Users paste job URL/data into `/jobs`; Career OS stores a canonical `Job`, captures snapshots, runs the existing safe `jobs.run_pipeline` segmentation/scoring flow, and exposes the persisted `jobId` for Application Packets and Resume Factory.

## Manual-only safety limits

This phase does not fetch, crawl, scrape, browse, upload, submit, email, call LinkedIn, call Gmail, call Calendar, call an AI provider, or auto-apply.

The URL field is evidence only.

The required source fields are manual/pasted title, company, and description.

## Commands

- `jobs.import_manual_url` — validates manual job data, emits `job.imported`, captures `job.manual_source`, runs the pipeline, persists job analysis rows, and writes current projections.
- `jobs.list` — lists persisted jobs with optional `userId`, `segment`, `status`, and `limit` filters.
- `jobs.get` — returns one persisted job by id.
- `jobs.run_pipeline` — still runs the existing job intelligence pipeline and now persists when a `JobStore` is available.

## Events

- `job.imported`
- `job.source_snapshot_captured`
- `job.persisted`
- Existing pipeline events: `job.normalized`, `job.remote_classified`, `job.clearance_segmented`, `job.certification_classified`, `job.scored`, `job.application_difficulty_scored`, `job.pipeline_completed`.

## State projections

- `job.current`
- `job.dashboard_segment`
- `job.pipeline_result`

## Persistence

`JobStore` has in-memory and Prisma implementations.

The Prisma implementation reuses existing models: `Company`, `Job`, `JobSource`, `JobSnapshot`, `JobSkill`, `JobCertification`, `JobClearanceFlag`, `JobRemoteClassification`, `JobSegment`, `JobFitScore`, and `JobApplicationDifficultyScore`.

Manual job IDs are deterministic: `job_<sha256(url || title|company|location).slice(0,16)>`.

Company IDs default to `company_<slug(companyName)>`.

## Integrations

Application Packets can now be created with only a persisted `jobId`; the packet command hydrates selected job/company/fit score from `JobStore`.

Resume Factory can now accept a persisted `jobId` without explicit `companyId`; it resolves company, target role, company name, and job description from the persisted job.

Resume truthfulness remains unchanged: generated bullets must come from verified Profile Facts only.

## Verification

Run:

```bash
npm run lint
npm run typecheck
npm test
npx prisma validate
git diff --check
```

Smoke path:

1. Open `/jobs`.
2. Import the demo Splunk/Cribl pasted job.
3. Confirm the job appears in a segment list with job ID, company ID, fit score, difficulty score, and snapshot ID.
4. Use that `jobId` with `application_packets.create`.
5. Use that `jobId` with `resume.generate` and verified Profile Facts.
6. Confirm no external action occurred.

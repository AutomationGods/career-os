# Job Discovery Domain

## Status

Implemented for B1 manual-only persisted job discovery.

## Purpose

Job Discovery accepts user-pasted job data, preserves it as evidence, persists a canonical job record, and hands the job to Job Intelligence for local segmentation and scoring.

## Safety boundary

The domain is manual-only.

It stores pasted URL/data only; it does not fetch, crawl, scrape, browse, automate a browser, upload files, submit applications, call LinkedIn, call Gmail, call Calendar, send email, call an AI provider, or auto-apply.

## Commands

- `jobs.import_manual_url`
  - Permission: `write_jobs`.
  - Requires pasted `title`, `companyName`/`company`, and `description`.
  - Stores `url` as source evidence only.
  - Captures `job.manual_source` snapshot.
  - Runs `jobs.run_pipeline` with the configured `JobStore`.
  - Returns `{ job, pipelineResult, sourceSnapshotId, externalActionTaken: false }`.
- `jobs.list`
  - Permission: `read_jobs`.
  - Filters: `userId`, `segment`, `status`, `limit`.
- `jobs.get`
  - Permission: `read_jobs`.
  - Returns a persisted job by id.

## Events

- `job.imported`
- `job.source_snapshot_captured`
- `job.persisted` from the pipeline persistence path.

## State projections

- `job.current`
- `job.pipeline_result`
- `job.dashboard_segment` from Job Intelligence.

## Store contract

`JobStore` lives at `packages/domains/src/job-discovery/job-store.ts`.

Implementations:

- `InMemoryJobStore` for tests and local in-memory command buses.
- `PrismaJobStore` for durable default orchestration.

Persisted records include company, sources, latest snapshot, skills, certifications, clearance flags, remote classifications, segments, fit scores, difficulty scores, and latest pipeline result.

## UI/API

- `/jobs` — manual import form and segmented persisted job list.
- `GET /api/jobs` — list persisted jobs.
- `POST /api/jobs/import` — import pasted job data.
- `GET /api/jobs/:id` — get one persisted job.
- `POST /api/jobs/:id/run-pipeline` — rerun the safe pipeline command.

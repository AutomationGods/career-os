# Job Intelligence Domain

## Status

Partial/implemented pipeline used by persisted job discovery.

## Purpose

Job Intelligence normalizes a job, classifies remote posture, segments clearance risk, classifies certifications, scores fit, scores application difficulty, emits pipeline events, and writes dashboard projections.

## Command

- `jobs.run_pipeline`
  - Permission: `write_jobs`.
  - Input: manual or persisted job payload with title/company/location/description/source plus optional certifications, required fields, easy-apply flag, and user id.
  - Output: normalized job, classifications, fit score, application difficulty score, dashboard segment, source snapshot id, and optional persisted job record.

## Events

- `job.normalized`
- `job.remote_classified`
- `job.clearance_segmented`
- `job.certification_classified`
- `job.scored`
- `job.application_difficulty_scored`
- `job.pipeline_completed`
- `job.persisted` when a `JobStore` is injected.
- `job.pipeline_failed` on failure.

## Snapshots

The pipeline captures `job.pipeline_input` through `SnapshotStore` and returns the source snapshot id.

Job Discovery also captures `job.manual_source` before invoking the pipeline.

## State projections

- `job.dashboard_segment` — current dashboard grouping and score summary.
- `job.pipeline_result` — normalized job, classifications, scores, persisted job id, and source snapshot id.

## Persistence

The pipeline keeps API compatibility with the previous in-memory/no-store path.

When `JobPipelineStores.jobStore` is provided, it calls `jobStore.savePipelineResult(...)`, creates/updates the canonical persisted job view, and emits `job.persisted`.

## Safety boundary

The pipeline is local and deterministic.

It does not fetch URLs, browse, scrape, call LinkedIn, upload, submit, email, or call an AI provider.

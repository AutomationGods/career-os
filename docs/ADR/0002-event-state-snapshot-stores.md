# ADR-0002: Use Event Store, State Store, and Snapshot Store

## Status

Accepted

## Context

Career OS and future products on the platform need durable history, current state, and preserved source evidence.

Career workflows include changing external job posts, generated document drafts, relationship state, application status, fit decisions, and safety approvals. These cannot be safely represented by current-state tables alone.

## Decision

Use three complementary stores:

- Event Store for append-only meaningful history.
- State Store for current truth projections.
- Snapshot Store for preserved source copies.

Events record what happened. State projections make the current system view fast to read. Snapshots preserve the external or generated content that decisions were based on.

## Why event history matters

Event history preserves auditability.

A career decision should be traceable to the event that produced it, including evidence, confidence, domain, manager, capability, worker, and timestamp.

## Why state projections matter

State projections power dashboards, API responses, and UI workspaces.

They avoid recomputing current truth from the full event log on every request.

## Why snapshots matter

Snapshots preserve mutable source material such as job descriptions, career pages, user documents, and generated drafts.

When external data changes later, the platform can still explain why a decision was made.

## How they work together

1. A command enters through the Orchestrator.
2. A manager selects a capability.
3. A worker uses tools and completes the action.
4. The domain emits an event with evidence and confidence.
5. The State Store updates a projection when current truth changes.
6. The Snapshot Store preserves source content when the decision depends on mutable content.

## Consequences

This model requires stricter event naming and projection discipline.

The benefit is that the platform becomes auditable, replayable, and reusable across Career OS and future operating-system products.

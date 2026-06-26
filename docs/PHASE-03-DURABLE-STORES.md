# Phase 3 — Durable Event, State, and Snapshot Stores

Phase 3 makes the platform remember what happened, what is currently true, and what changed over time.

This phase does not add Gmail, Calendar, browser automation, LinkedIn scraping, email sending, or auto-submit behavior.

## Why durable stores matter

Career OS is the first flagship implementation of a reusable event-driven automation platform.

Durable stores make future workflows auditable and recoverable:

- job pipelines
- application packets
- recruiter history
- resume versions
- follow-ups
- future Gmail events
- future Calendar interview events
- future Browser Copilot audit trails
- long-term learning
- observability

## Event Store

The Event Store records meaningful facts.

Each event supports:

- id
- eventType
- entityType
- entityId
- domain
- manager
- capability
- worker
- userId
- payload
- evidence
- confidence
- modelUsed
- promptVersion
- createdAt

Implementations:

- `InMemoryEventStore` for tests and local lightweight usage.
- `PrismaEventStore` for durable Postgres-backed storage.

## State Store

The State Store stores current truth as projections.

Examples:

- `job.current_status`
- `application.current_status`
- `person.relationship_summary`
- `company.current_profile`
- `daily_mission.current_queue`

Each projection supports:

- id
- userId
- entityType
- entityId
- projectionType
- data
- sourceEventId
- createdAt
- updatedAt

Implementations:

- `InMemoryStateStore` for tests and local lightweight usage.
- `PrismaStateStore` for durable Postgres-backed storage.

## Snapshot Store

The Snapshot Store preserves what something looked like at a point in time.

Examples:

- `job.description_snapshot`
- `company.career_page_snapshot`
- `application.packet_snapshot`
- `email.message_snapshot`
- `document.version_snapshot`

Each snapshot supports:

- id
- userId
- entityType
- entityId
- snapshotType
- data
- checksum
- createdAt

Implementations:

- `InMemorySnapshotStore` for tests and local lightweight usage.
- `PrismaSnapshotStore` for durable Postgres-backed storage.

## In-memory vs Prisma usage

Use in-memory stores in unit tests when persistence is not the subject of the test.

Use Prisma stores in API routes, production workflows, and integration tests that verify durable behavior.

The job pipeline accepts store implementations through dependency injection. By default it keeps in-memory behavior for existing tests. API routes inject Prisma-backed stores.

## Future domain guidance

Future domains should:

1. emit events through the Event Store contract.
2. update current truth through the State Store contract.
3. capture source material through the Snapshot Store contract when decisions depend on mutable content.
4. include evidence and confidence when the event records a decision.
5. keep UI components out of business logic.

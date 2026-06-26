# Database

Career OS uses Postgres through Prisma for durable platform storage.

The database supports the reusable automation platform first, then Career OS-specific domains on top.

## Durable platform stores

### Event Store

`Event` is the append-oriented history of meaningful system behavior.

Indexed fields:

- `userId`
- `eventType`
- `entityType`
- `entityId`
- `domain`
- `createdAt`

Events preserve payload, evidence, confidence, model, prompt version, manager, capability, and worker metadata when available.

### State Store

`StateProjection` stores current truth for fast reads.

Indexed fields:

- `userId`
- `entityType`
- `entityId`
- `projectionType`
- `updatedAt`

State projections contain `data` and optional `sourceEventId` so current state can link back to the event that produced it.

### Snapshot Store

`Snapshot` preserves source material at a point in time.

Indexed fields:

- `userId`
- `entityType`
- `entityId`
- `snapshotType`
- `createdAt`

Snapshots contain `data` and a checksum for simple comparison.

## Store implementations

Each store has two implementations:

- in-memory implementation for tests and lightweight local usage.
- Prisma implementation for durable Postgres-backed workflows.

## Current scope

This layer provides durable plumbing only.

It does not add Gmail sync, Calendar sync, email sending, browser automation, LinkedIn scraping, CAPTCHA bypassing, or auto-submit behavior.

# Events

Events record what happened in the platform.

Career OS uses events to make job pipeline decisions, application packet updates, relationship changes, and future automation behavior auditable.

## Event envelope

Every event supports:

- `id`
- `eventType`
- `entityType`
- `entityId`
- `domain`
- `manager`
- `capability`
- `worker`
- `userId`
- `payload`
- `evidence`
- `confidence`
- `modelUsed`
- `promptVersion`
- `createdAt`

Required fields:

- `eventType`
- `entityType`
- `entityId`
- `domain`

`payload` defaults to `{}`.

## Durable Event Store

Use `EventStore` as the contract.

Available implementations:

- `InMemoryEventStore`
- `PrismaEventStore`

Required operations:

- `append(event)`
- `appendMany(events)`
- `getById(id)`
- `listByEntity(entityType, entityId)`
- `listByType(eventType)`
- `listByDomain(domain)`
- `listRecent(limit)`
- `listByUser(userId)`

## Command lifecycle events

The Orchestrator emits command lifecycle events for workflow execution:

- `command.received`
- `command.accepted`
- `command.completed`
- `command.failed`
- `command.rejected`

Lifecycle event payloads include command id, command type, requestedBy, domain, entity type, entity id, status, and error details when relevant.

## Event and state relationship

A meaningful event should update a state projection unless there is a documented reason not to.

State projections should preserve `sourceEventId` when possible.

## Safety

Events may record prepared drafts, placeholders, and recommendations.

Events must not imply that an email was sent, an application was submitted, or a browser action occurred unless a future approved feature explicitly performs that action.

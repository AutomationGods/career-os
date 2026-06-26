# Developer Guide

Career OS is the first flagship application on a reusable event-driven automation platform.

Use the platform pattern for every new domain and feature:

```text
Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace
```

## Add a new domain

1. Create `packages/domains/src/<domain-slug>/`.
2. Add `manager.ts`, `commands.ts`, `events.ts`, `README.md`.
3. Add `capabilities/index.ts`, `workers/index.ts`, and `tools/index.ts`.
4. Add `__tests__/placeholder.test.ts` or meaningful tests.
5. Add `docs/domains/<domain-slug>.md`.
6. Register the domain in `packages/domains/src/registry.ts`.
7. Run the registry invariant test.

Example manager:

```ts
import type { DomainDefinition } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Example Domain",
  slug: "example",
  manager: "Example Manager",
  capabilities: ["ExampleCapability"],
  workers: ["ExampleWorker"],
  tools: ["ExampleTool"],
  commands: ["example.execute"],
  events: ["example.completed"],
  permissions: [],
  dependencies: [],
  status: "placeholder",
  version: "0.1.0"
};

export class ExampleManager {
  readonly definition = definition;
}
```

## Add a manager

A manager receives commands from the Orchestrator and selects a capability.

Managers should not call another domain directly.

## Add a capability

A capability defines a specific business function.

Document:

- input shape
- output shape
- permissions
- workers
- tools
- emitted events
- state projection effects
- tests

## Add a worker

A worker performs one execution step inside a capability.

Workers may call tools owned by the same domain.

Workers must emit or request events through the domain flow.

## Add a tool

A tool wraps low-level behavior such as parsing, classification, external API calls, scoring helpers, export helpers, or format conversion.

Tools do not orchestrate workflows.

## Add a command

Add the command name to `commands.ts` and the domain registry definition.

Command names use domain-prefixed names, for example:

```ts
export const commands = ["jobs.run_pipeline"];
```

Register a handler through the Orchestrator/Command Bus layer. API routes should create a `CareerCommand` and call `CommandBus.execute(command)` instead of calling domain services directly.

## Add an event

Add the event name to `events.ts` and the domain registry definition.

Event names record completed facts, for example:

```ts
export const events = ["job.pipeline_completed"];
```

Events should preserve evidence and confidence when the event records a decision.

## Add a state projection

State projections represent current truth for fast reads.

A projection should include:

- projection type
- entity type
- entity id
- current state data
- source event id when available
- updated timestamp

Use `InMemoryStateStore` in unit tests and `PrismaStateStore` in durable API/production paths.

## Emit durable events

Use the `EventStore` contract instead of writing directly to Prisma.

Use `InMemoryEventStore` for tests and `PrismaEventStore` for durable API/production paths.

Every meaningful action should include domain, manager, capability, worker, evidence, confidence, and payload when available.

## Capture snapshots

Use the `SnapshotStore` contract when decisions depend on mutable source data.

Use `InMemorySnapshotStore` for tests and `PrismaSnapshotStore` for durable API/production paths.

Snapshot types should describe the captured source, for example `job.description_snapshot` or `application.packet_snapshot`.

## Add an API route

API routes should validate input, build a command, submit it to the Command Bus, and return consistent JSON.

API routes should not own scoring, classification, packet assembly, dedupe, persistence, or business decisions.

Example:

```ts
const command = createCommand({
  type: "jobs.run_pipeline",
  requestedBy: "api",
  entityType: "job",
  entityId: params.id,
  payload: body
});
const result = await createDefaultCommandBus().execute(command);
```

## Add a UI workspace

UI workspaces render state projections and trigger commands.

UI components should not contain domain business logic.

## Verification commands

Run these before opening a PR:

```bash
npm run typecheck
npm test
npx prisma validate
git diff --check
git status --short
```

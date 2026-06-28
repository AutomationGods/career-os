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

Add a permission mapping in `packages/orchestration/src/permissions.ts`. If the command can send, submit, upload, browse, write calendar data, contact recruiters, answer sensitive questions, or modify the master profile, default to `requires_approval`.

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

## Add a local document export

Document exports must use the same platform path as every other workflow:

```text
UI/API → Command Bus → Orchestrator → Document Export Domain → Worker/Tool → Event Store → State Store → Snapshot Store
```

Use `document_exports.create_markdown` or `document_exports.create_docx` for local review exports.

Store local artifacts in `DocumentExport`, `DocumentVersion`, and `DocumentMetadata`; do not upload to external storage from this path.

Every export must preserve the exact warning text:

```text
Local export only. Human review required before upload, email, submission, or external use.
```

Submission-bound export remains a separate approval-gated capability.

## Add manual persisted job discovery behavior

Use the B1 path for job intake:

```text
/jobs → /api/jobs/import → jobs.import_manual_url → Job Discovery Manager → jobs.run_pipeline → JobStore
```

Rules:

- Require pasted `title`, `companyName`/`company`, and `description`.
- Store `url` as evidence only.
- Use `JobStore` instead of writing job tables directly.
- Keep `jobs.run_pipeline` compatible with no-store tests and API callers.
- Map safe read/write job commands to `read_jobs` or `write_jobs`.
- Preserve `externalActionTaken: false` for manual import flows.
- Do not add fetching, crawling, scraping, browser automation, uploads, submissions, email, Gmail, Calendar, LinkedIn scraping, AI provider calls, or auto-apply in this path.

Integration points:

- `application_packets.create` may hydrate selected job/company/fit score from `jobStore.getById(jobId)`.
- `resume.generate` may resolve company/role/description from a persisted job id.
- Resume output still uses verified Profile Facts only.

## Add an approval-gated command

1. Define the command in the owning domain.
2. Map the command to a permission in the permission policy.
3. Require approval for sensitive permissions.
4. Test allowed, denied, and `requires_approval` paths.
5. Do not call tools directly from UI or API routes.

Approval decisions emit `approval.requested`, `approval.approved`, `approval.rejected`, `approval.cancelled`, `approval.expired`, `command.approval_granted`, and `command.approval_denied`.

Approved replay emits `approval.replay_started`, `approval.replay_completed`, `approval.replay_failed`, `command.replay_received`, `command.replay_started`, `command.replay_completed`, and `command.replay_failed`.

## Replay an approved command

1. Rebuild the command from the existing `ApprovalRequest`.
2. Add approval replay metadata: approval request id, original command id, approved status, and permission.
3. Submit through an approved replay Command Bus handler.
4. Let the Orchestrator and Permission Policy verify the approval metadata.
5. Persist replay status on the approval request.
6. Treat `completed` replay as idempotent and return the stored result.

Do not execute directly from API routes or approval UI components.

## Test approval behavior locally

1. Start the app with `npm run dev`.
2. Open `/approvals`.
3. Use **Run Allowed Test Command** to submit safe demo `jobs.run_pipeline` data.
4. Use **Run Requires Approval Test Command** to submit demo `email.send` data that creates a pending approval without sending email.
5. Approve, reject, or cancel the pending approval from the page.
6. Replay an approved demo `email.send` request and confirm it completes with `externalActionTaken: false`.
7. Use **Run Denied Test Command** to submit demo `application.auto_submit` data that policy rejects before execution.

The matching route handlers live under `/api/dev/commands/*` and must stay side-effect free.

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
npm run lint
npm run typecheck
npm test
npx prisma validate
git diff --check
git status --short
```

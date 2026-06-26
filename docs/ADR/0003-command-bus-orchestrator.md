# ADR-0003: Use Command Bus and Orchestrator for platform workflow execution

## Status

Accepted

## Context

Career OS is a platform-first, event-driven automation system.

After durable Event, State, and Snapshot Stores were added, APIs and services still needed a consistent execution boundary. Without that boundary, routes and workers could drift into direct service calls and bypass domain ownership, permissions, approvals, lifecycle events, and audit trails.

## Decision

Use a Command Bus and Orchestrator for platform workflow execution.

The execution path is:

```text
UI / API / Worker
→ Command Bus
→ Orchestrator
→ Domain Manager
→ Capability
→ Worker
→ Tool
→ Event Store
→ State Store
→ Snapshot Store
→ UI Projection
```

Commands request work. Events record what happened.

The Command Bus validates command shape and dispatches to registered handlers. The Orchestrator resolves the owning domain, checks permission placeholders, routes to a domain manager, emits command lifecycle events, and returns a normalized result.

## Consequences

API routes become thin command submitters.

Domain managers become the workflow boundary.

Command lifecycle events provide an audit trail for accepted, completed, failed, and rejected work.

This adds a small amount of ceremony, but it prevents scattered service calls as the platform grows.

## Alternatives considered

### Direct API-to-service calls

Rejected because routes would own workflow decisions and bypass orchestration.

### Worker-to-worker calls

Rejected because workers would bypass domain boundaries and approval gates.

### Event-only orchestration

Rejected for now because commands need synchronous results for API routes and tests.

## Extensibility

Future domains add commands by registering handlers and exposing domain manager capabilities.

Future permission and approval services can be plugged into the Orchestrator without rewriting API routes.

# Phase 4 — Orchestrator and Command Bus

Phase 4 adds the platform execution boundary.

APIs, workers, schedulers, and UI actions should submit commands instead of calling business workflows directly.

## Execution path

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

## Commands vs events

Commands request work.

Events record what happened.

A command may be rejected, require approval, fail, or complete. A completed meaningful command should emit domain events and update state projections where current truth changes.

## Command Bus

The Command Bus owns handler registration and command execution.

Operations:

- `registerHandler(commandType, handler)`
- `execute(command)`
- `canHandle(commandType)`
- `listHandlers()`

The bus validates command shape, resolves a registered handler, catches handler failures, and returns a normalized `CommandResult`.

## Orchestrator

The Orchestrator is the traffic controller.

It resolves the owning domain from the Domain Registry, checks permission placeholders, routes to a domain manager, emits command lifecycle events, and returns a normalized result.

Lifecycle events:

- `command.received`
- `command.accepted`
- `command.completed`
- `command.failed`
- `command.rejected`

## Initial commands

The initial command boundary supports:

- `jobs.run_pipeline`
- `application_packets.create`
- `application_packets.generate_placeholders`
- `relationships.dedupe`
- `daily_mission.generate`

## Thin APIs

API routes should build commands and submit them to the Command Bus.

They should not own workflow decisions, scoring, classification, packet assembly, relationship dedupe, or store writes.

## Safety

This phase does not add Gmail, Calendar, browser automation, LinkedIn scraping, email sending, or auto-submit behavior.

Approval and permission services remain placeholders until the dedicated approval-gate PR.

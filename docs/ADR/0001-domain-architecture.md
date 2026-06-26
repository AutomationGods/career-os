# ADR-0001: Use Domain → Manager → Capability → Worker → Tool architecture

## Status

Accepted

## Context

Career OS is the first flagship application built on a reusable event-driven automation platform.

The platform must support Career OS now and future products such as Sales OS, Grant OS, Real Estate OS, Recruiting OS, Client Acquisition OS, Agency Operations OS, Compliance OS, and Healthcare Operations OS later.

A flat feature structure would make cross-domain automation, approvals, event history, and state projections hard to govern as the platform grows.

## Decision

Use this architecture everywhere:

```text
Domain
  → Manager
    → Capability
      → Worker
        → Tool
          → Event
            → State Projection
              → UI Workspace
```

Every domain must be registered in the Domain Registry and represented by source, docs, commands, events, manager, capabilities, workers, tools, and tests.

Domains communicate through the Orchestrator with commands and events.

## Consequences

This creates more upfront structure than a small app would normally need.

The benefit is that domain boundaries, permissions, approvals, evidence, and state projection rules are explicit before sensitive automations are added.

Future products can reuse the platform layer without rebuilding the architecture.

## Alternatives considered

### Feature folders only

Rejected because feature folders do not encode domain boundaries, manager ownership, worker restrictions, or event/state obligations.

### UI-first implementation

Rejected because business logic would drift into components and become hard to audit.

### Direct service-to-service calls

Rejected because direct calls bypass orchestration, permissions, approval gates, event capture, and observability.

## Why this supports long-term extensibility

The pattern lets new domains be added without changing the core platform contract.

Each capability declares inputs, outputs, permissions, events, workers, tools, and tests. That makes the system governable as new products reuse the platform.

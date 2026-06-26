# Architecture Bible

Career OS is the first flagship implementation of a reusable event-driven automation platform.

The platform is not only a job-search application. It is an automation operating system that can later support products such as Sales OS, Grant OS, Real Estate OS, Recruiting OS, Client Acquisition OS, Agency Operations OS, Compliance OS, and Healthcare Operations OS.

## Platform vision

Build the reusable platform first. Career OS runs on top of it as the first career-management implementation.

The reusable platform owns the kernel, registry, command routing, event history, state projections, snapshots, orchestration, permissions, approvals, and observability.

The Career OS layer owns job search, career intelligence, application packets, relationships, interviews, follow-ups, documents, and career growth workflows.

## Layer separation

### Platform Layer

The Platform Layer is the reusable automation operating system:

- System Kernel
- Domain Registry
- Command Bus
- Event Store
- State Store
- Snapshot Store
- Orchestration Domain
- Configuration Domain
- Security Domain
- Trust & Safety Domain
- Scheduler Domain
- Notification Domain
- Integration Domain
- AI Domain
- Reasoning Domain
- Knowledge Domain
- Memory Domain
- Observability Domain
- QA Domain
- Recovery Domain
- Workflow Domain
- Mission Domain

### Career OS Layer

The Career OS Layer is the flagship job-search and career-management implementation:

- Company Intelligence
- Career Page
- ATS Intelligence
- Job Discovery
- Job Normalization
- Job Intelligence
- Fit Scoring
- Clearance Segmentation
- Remote Classification
- Resume Factory
- Cover Letter
- Application Packet
- Email Intelligence
- Calendar Intelligence
- Follow-Up Automation
- Interview Preparation
- Interview Follow-Up
- Relationship Intelligence
- Market Intelligence
- Skill Gap Intelligence
- Career Strategy
- Offer Negotiation
- Finance
- Portfolio
- Referral
- Reputation
- Simulation

## Required architecture pattern

Every domain follows this path:

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

## Domain

A domain owns one bounded area of the system. It exposes commands, emits events, and owns its own manager/capabilities/workers/tools.

Every domain must be represented in:

- source folder
- domain registry
- docs/domains page
- manager placeholder
- commands file
- events file
- capabilities folder
- workers folder
- tools folder
- README.md
- tests

## Manager

A manager receives commands through the Orchestrator. It decides which capability handles the command.

Managers do not reach directly into other domains.

## Capability

A capability defines an explicit business function. It owns inputs, outputs, permissions, workers, events, and tests.

## Worker

A worker performs one unit of execution for a capability. Workers may call tools owned by their own domain.

A worker must not directly call another worker or bypass the Orchestrator.

## Tool

A tool wraps a low-level integration, classifier, parser, exporter, or utility.

Tools do not make orchestration decisions.

## Command Bus and Orchestrator

APIs, workers, schedulers, and UI actions submit commands to the Command Bus.

The Command Bus validates command shape, resolves a registered handler, executes it, and returns a normalized command result.

The Orchestrator is the traffic controller behind the command boundary. It resolves the owning domain from the Domain Registry, checks permission placeholders, routes to a domain manager, emits command lifecycle events, and returns the result.

## Command and event separation

Commands request work. Events record what happened.

A command may fail validation and emit no domain event. A completed meaningful action must emit an event with evidence, confidence, timestamp, domain, manager, capability, and worker where available.

Command lifecycle events include `command.received`, `command.accepted`, `command.completed`, `command.failed`, and `command.rejected`.

## Event Store role

The Event Store preserves permanent history. It is the audit log of meaningful system behavior.

Events should be append-only and should retain evidence for later review.

Career OS provides `InMemoryEventStore` for tests and `PrismaEventStore` for durable Postgres-backed workflows.

## State Store role

The State Store keeps current truth as projections built from events or intentionally documented direct updates.

State projections power dashboards and fast reads.

Career OS provides `InMemoryStateStore` for tests and `PrismaStateStore` for durable Postgres-backed workflows.

## Snapshot Store role

The Snapshot Store preserves copies of external or source data as it was observed.

Snapshots protect against changing career pages, job descriptions, resumes, and external records.

Career OS provides `InMemorySnapshotStore` for tests and `PrismaSnapshotStore` for durable Postgres-backed workflows. Snapshot checksums support simple comparison without complex visual diffing.

## Domain Registry role

The Domain Registry is the source of truth for available domains, managers, capabilities, workers, tools, commands, events, permissions, dependencies, status, and version.

Registry drift is a build/test failure.

## Orchestrator role

The Orchestrator routes commands to domain managers and enforces cross-domain boundaries.

Domains communicate through commands and events, not direct worker-to-worker calls.

API routes should stay thin: build a command, submit it to the Command Bus, and return the normalized result.

## Permission engine role

The permission engine checks whether a command is allowed before execution.

Sensitive actions require explicit approval before execution.

## Human approval gates

The platform requires approval before:

- sending emails
- submitting applications
- contacting recruiters for the first time
- answering sensitive questions
- modifying the master profile
- uploading files to unknown sites
- exporting AI-generated documents for real use

## What must never happen

- No worker talks directly to another worker.
- No domain bypasses the Orchestrator.
- No business logic lives in UI components.
- No auto-submit without explicit trusted mode.
- No email sending without approval.
- No LinkedIn scraping as a core feature.
- No CAPTCHA bypassing.
- No fake experience, fake certifications, fake clearance, or invented job facts.
- No unregistered domain.
- No important AI decision without evidence.

# Engineering Constitution

Career OS is the flagship implementation of a reusable event-driven automation platform.

These rules apply to the platform layer and to every product built on it.

## Core rules

1. No worker talks directly to another worker.
2. No domain bypasses the Orchestrator.
3. APIs and workers submit workflow requests through the Command Bus.
4. Every meaningful action emits an event.
5. Every important event updates state or intentionally does not with a documented reason.
6. Business logic does not live in UI components.
7. Sensitive actions require approval.
8. No auto-submit without explicit trusted mode.
9. No email sending without approval.
10. No LinkedIn scraping as a core feature.
11. No CAPTCHA bypassing.
12. No fake experience, fake certifications, fake clearance, or invented job facts.
13. Every AI-generated document must be versioned.
14. Every AI decision must preserve evidence.
15. Every domain must be registered.
16. Every new capability must define inputs, outputs, permissions, events, and tests.

## Platform-first rule

Build the reusable platform first. Career OS is the first flagship application running on it.

Platform code should stay reusable by future products such as Sales OS, Grant OS, Real Estate OS, Recruiting OS, Client Acquisition OS, Agency Operations OS, Compliance OS, and Healthcare Operations OS.

## Domain boundary rule

A domain owns its own manager, capabilities, workers, tools, commands, events, permissions, and tests.

Cross-domain work must flow through the Command Bus and Orchestrator via commands/events.

## Event evidence rule

Important events should include:

- event type
- entity type
- entity id
- domain
- manager
- capability
- worker
- payload
- evidence
- confidence
- timestamp

## UI rule

UI components render state and trigger commands through API routes or orchestrated interfaces.

UI components do not own business decisions, scoring logic, classification logic, approval logic, or integration behavior.

## Safety rule

Career OS optimizes for truthful, human-approved career operations.

The system may prepare drafts, packets, placeholders, classifications, and recommendations. It must not represent generated content as user-approved truth until the user approves it.

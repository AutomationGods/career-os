# DOMAINS

This document captures the Career OS Phase 1 foundation from the PRD. The platform is organized as Domain → Manager → Capabilities → Workers → Tools → Events → State Projections → UI Workspaces.

- Event Store preserves permanent history.
- State Store maintains current truth.
- Snapshot Store preserves historical copies.
- Domain Registry lets managers, capabilities, workers, tools, commands, events, permissions, dependencies, status, and versions evolve without changing the orchestrator.
- Human approval is required for sensitive actions; auto-submit and LinkedIn scraping are not implemented.

## MVP domain readiness

The production-usable Career OS slice is the manual-safe apply loop:

1. `job-discovery` persists pasted jobs and runs local job intelligence.
2. `application-packet` persists durable packet workspaces and manual status transitions.
3. `identity` owns Profile Facts and Master Resume import.
4. `resume-factory` generates truthfulness-guarded resume drafts from verified facts only.
5. `document-export` creates local Markdown/DOCX exports.

## Future modules

The registry still contains platform expansion domains for companies, recruiters, email, calendar, follow-ups, market intelligence, browser infrastructure, and other workflows.

Those modules remain placeholders or partial implementations until they have command handlers, APIs, UI, tests, and docs.

Gmail, Calendar, browser automation, Chrome extension work, LinkedIn scraping, proxy scraping, CAPTCHA bypassing, uploads, email sending, and auto-submit remain explicitly out of scope for the MVP apply loop.

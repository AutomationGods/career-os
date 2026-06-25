# DATABASE

This document captures the Career OS Phase 1 foundation from the PRD. The platform is organized as Domain → Manager → Capabilities → Workers → Tools → Events → State Projections → UI Workspaces.

- Event Store preserves permanent history.
- State Store maintains current truth.
- Snapshot Store preserves historical copies.
- Domain Registry lets managers, capabilities, workers, tools, commands, events, permissions, dependencies, status, and versions evolve without changing the orchestrator.
- Human approval is required for sensitive actions; auto-submit and LinkedIn scraping are not implemented.

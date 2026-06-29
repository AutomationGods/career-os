# Application Packet Domain

Partial MVP domain for durable, manual-safe job application workspaces.

## Implemented

- Creates packets from persisted job IDs.
- Persists packet records in `ApplicationPacketStore` implementations.
- Lists, gets, generates deterministic drafts, and updates manual status through orchestrator commands.
- Writes `application_packet.current` and `application_packet.review_queue` projections.
- Emits packet-created, packet-updated, draft-created, and status-updated events.

## Safety boundary

The domain does not submit applications, send email, upload files, browse, scrape, or claim unverified facts.

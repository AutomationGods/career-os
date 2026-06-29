# Phase 11 — Application Packets v1

## Shipped MVP slice

Career OS now ships a manual-safe apply loop that can be used for real job applications today:

1. Import a pasted job in `/jobs`.
2. Create a durable Application Packet in `/application-packets`.
3. Generate copyable resume-brief, cover-letter, and recruiter-message drafts.
4. Generate a Resume Factory draft from verified Profile Facts.
5. Export Markdown/DOCX locally.
6. Mark packet status manually as awaiting review, ready to apply, submitted manually, or closed.

## Durable packet model

Application Packet persistence now uses:

- `Application`
- `ApplicationPacket`
- `ApplicationStatusHistory`

The domain also keeps `InMemoryApplicationPacketStore` for tests and local isolated command buses.

## Commands

- `application_packets.create`
- `application_packets.list`
- `application_packets.get`
- `application_packets.generate_placeholders`
- `application_packets.update_status`

All commands route through Command Bus → Orchestrator → Application Packet Manager → Store.

## Safety contract

Application Packets are manual-only.

They do not:

- auto-submit applications;
- send email;
- upload files;
- browse employer sites;
- scrape LinkedIn or job boards;
- bypass CAPTCHA;
- claim unverified certifications, clearance, metrics, titles, dates, tools, or work authorization.

Generated text is deterministic draft material for human review.

## UI

- `/application-packets` lists durable packets grouped by status and creates packets from saved job IDs.
- `/application-packets/[id]` shows packet detail, copyable drafts, verified-facts resume generation, local export, and manual status buttons.
- `/` labels the MVP path as production-usable and parks the remaining scaffolded modules as future expansion.

## Deferred

The MVP does not include public-SaaS requirements yet:

- real authentication and tenant isolation;
- billing/subscriptions;
- support/help center;
- deployment hardening;
- analytics/observability dashboard;
- true external job search integrations;
- browser automation or external application submission;
- full implementation of all placeholder domains.

# Career OS

Career OS is an event-driven, domain-based, AI-assisted career operating system. It is not a simple job board and it is not a blind auto-apply bot.

## Phase 1 foundation

- Next.js dashboard shell with workspaces for missions, jobs, applications, relationships, documents, follow-ups, settings, health, and domain registry.
- Worker app scaffold using BullMQ and Redis.
- Prisma/Postgres schema covering events, state, snapshots, companies, jobs, applications, documents, people, email, calendar, follow-up, and intelligence records.
- Domain registry and placeholders for all 57 required domains.
- Greenhouse and Lever collectors, Ashby placeholder, manual URL importer, job normalization, remote classification, clearance segmentation, and basic fit scoring.

## Safety rules

Career OS requires human approval before sending emails, submitting applications, answering sensitive questions, contacting recruiters for the first time, modifying the master profile, or uploading files to unknown sites. LinkedIn scraping and auto-submit are intentionally excluded from Phase 1.

## Commands

```bash
npm install
npm run typecheck
npm run build
```

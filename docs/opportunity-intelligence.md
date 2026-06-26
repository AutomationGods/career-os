# Opportunity Intelligence

Opportunity Intelligence coordinates safe planning for hidden jobs, hiring signals, relationship discovery, and campaign tracking.

This is playbook infrastructure only.

No searches, messages, uploads, or submissions run in this PR.

## Platform boundary

```text
Domain → Manager → Capability → Worker → Tool → Event → State Projection
```

Every new capability emits planned events and planned state projection names only.

## Opportunity Intelligence Domain

Capabilities:

- `HiddenJobDiscoveryCapability`
- `HiringSignalDetectionCapability`

Commands:

- `opportunity.hidden_jobs.plan`
- `opportunity.hiring_signals.plan`

Events:

- `opportunity.hidden_jobs_planned`
- `opportunity.hiring_signals_planned`

State projections:

- `opportunity.hidden_opportunities.planned`
- `opportunity.hiring_signals.planned`

Purpose:

- plan manual cross-checks of public career pages, public ATS jobs, and public job-board snippets
- plan manual review of public growth, launch, hiring, and team-expansion signals

## Relationship Intelligence Domain

Capabilities:

- `RecruiterDiscoveryCapability`
- `HiringManagerDiscoveryCapability`

Commands:

- `relationships.discover_recruiters.plan`
- `relationships.discover_hiring_managers.plan`

Events:

- `relationship.recruiter_discovery_planned`
- `relationship.hiring_manager_discovery_planned`

State projections:

- `relationship.recruiter_discovery.planned`
- `relationship.hiring_manager_discovery.planned`

Purpose:

- plan manual identification of public recruiter contacts
- plan manual identification of likely hiring teams from public sources

Relationship discovery is discovery-only.

It must not auto-contact anyone.

It must not scrape LinkedIn.

It must not send email.

## Mission Domain

Capability:

- `CampaignTrackingCapability`

Command:

- `mission.campaign_tracking.plan`

Event:

- `mission.campaign_tracking_planned`

State projection:

- `mission.search_campaigns.planned`

Purpose:

- track target role families
- track target company lists
- track selected safe search pattern IDs
- track planned relationship discovery queues
- track hidden opportunity review queues
- track hiring signal review queues

## Guardrails

All playbooks keep these constraints:

- manual review required
- public sources only
- no login bypass
- no LinkedIn scraping
- no automated execution
- no auto-contact
- no auto-submit
- no external side effects

## Deferred work

Later PRs may add command handlers that create durable planned projections.

Those handlers must still avoid external execution and must pass through the Orchestrator permission policy.

Future Gmail, Calendar, Browser Copilot, document upload, recruiter outreach, or submission features must use Human Approval Gates before any sensitive action can execute.

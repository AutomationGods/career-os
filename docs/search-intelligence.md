# Search Intelligence

Search Intelligence is a Research Domain capability for planning safe, manual public-source job-search research.

It is infrastructure only.

It does not execute searches.

## Domain contract

```text
Research Domain
→ Research Manager
→ SearchIntelligenceCapability / OSINTCompanyReconCapability
→ SearchPatternPlanningWorker / OSINTCompanyReconWorker
→ SearchPatternCatalogTool / CompanyReconChecklistTool
→ research.search_intelligence_planned / research.company_recon_planned
→ research.* planned state projections
```

## Commands

- `research.search_intelligence.plan`
- `research.company_recon.plan`

These commands are registry metadata for future command handlers.

No runtime search execution is implemented in this PR.

## Events

- `research.search_intelligence_planned`
- `research.company_recon_planned`

Events describe planned research work only.

## Permissions

- `read_jobs`

Search Intelligence may inspect existing job and company context later.

It must not send messages, submit applications, browse on behalf of the user, bypass logins, or scrape LinkedIn.

## Safe pattern catalog

The source-of-truth pattern catalog lives in:

```text
packages/domains/src/research/search-intelligence-playbooks.ts
```

It covers:

- ATS job discovery
- company career page discovery
- Splunk jobs
- Cribl jobs
- SIEM jobs
- remote DevOps jobs
- recruiter discovery
- hiring manager discovery
- company technology signals

## Guardrails

Every search pattern has these flags:

```text
requiresManualReview = true
noLoginBypass = true
noLinkedInScraping = true
noAutomatedExecution = true
```

The guardrails are part of the playbook schema so future workers cannot treat these patterns as executable browser instructions.

## Company recon checklist

OSINT company recon is limited to public evidence capture:

- public career surfaces
- public ATS or job-board surfaces
- public technology signals
- public people-map hints

The output is a planned checklist and future state projection, not an automated investigation.

## State projection path

Future handlers should project planned research into names such as:

- `research.company_recon.career_surface`
- `research.company_recon.hiring_stack`
- `research.company_recon.technology_signals`
- `research.company_recon.people_map`

## Prohibited behavior

Search Intelligence must not add:

- LinkedIn scraping
- login bypass
- automated search execution
- browser automation
- email sending
- recruiter outreach
- application submission
- file upload

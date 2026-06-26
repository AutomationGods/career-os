# Hacker Job Hunt Playbook

This playbook turns public job-search intelligence into structured Career OS planning data.

It is manual-first.

It does not scrape LinkedIn, bypass logins, send email, use browser automation, upload files, or submit applications.

## Architecture boundary

```text
Domain → Manager → Capability → Worker → Tool → Event → State Projection
```

The playbook creates planned work only:

- search pattern plans
- company recon checklists
- hidden opportunity review queues
- hiring signal review queues
- relationship discovery review queues
- campaign tracking projections

## Guardrails

Every pattern requires:

- manual review before use
- public sources only
- no login bypass
- no LinkedIn scraping
- no automated execution
- no auto-contact
- no auto-submit

## Safe search patterns

These are examples for a human to copy into a normal search engine later.

Career OS must store them as plans, not execute them.

### ATS job discovery

Purpose: find public jobs hosted on common ATS pages.

Examples:

```text
site:greenhouse.io DevOps remote Splunk
site:lever.co SRE Cribl
site:ashbyhq.com platform engineer SIEM
```

Capture:

- public job URL
- company name
- role title
- posted date when visible
- ATS source

### Company career page discovery

Purpose: find first-party career pages and public role indexes.

Examples:

```text
site:company.com/careers Splunk
site:company.com/jobs DevOps remote
company name careers security engineer
```

Capture:

- career page URL
- role URL
- company domain
- public source timestamp

### Splunk jobs

Purpose: find roles mentioning Splunk administration, observability, or SIEM operations.

Examples:

```text
Splunk engineer remote job
site:greenhouse.io Splunk platform engineer
"Splunk" "DevOps" "remote"
```

Capture:

- role URL
- Splunk requirement text
- seniority
- remote or hybrid signal

### Cribl jobs

Purpose: find roles mentioning Cribl Stream, telemetry pipelines, or observability routing.

Examples:

```text
Cribl engineer remote job
"Cribl Stream" "platform engineer"
site:lever.co Cribl observability
```

Capture:

- role URL
- Cribl requirement text
- observability stack
- source

### SIEM jobs

Purpose: find SIEM engineering, detection, and security operations roles.

Examples:

```text
SIEM engineer remote
"security operations" "Splunk" "remote"
site:ashbyhq.com SIEM engineer
```

Capture:

- role URL
- SIEM platform named
- security clearance signal
- remote or hybrid signal

### Remote DevOps jobs

Purpose: find remote DevOps, SRE, platform, and infrastructure roles.

Examples:

```text
remote DevOps Terraform AWS job
site:greenhouse.io remote SRE Kubernetes
"platform engineer" "remote" "Terraform"
```

Capture:

- role URL
- remote policy
- core stack
- employment type

### Recruiter discovery

Purpose: identify public recruiter or talent acquisition contacts without scraping LinkedIn or contacting anyone automatically.

Examples:

```text
company recruiter email careers
site:company.com recruiter talent acquisition
company talent acquisition team
```

Capture:

- public profile URL
- company team page
- role or function
- contact source if public

### Hiring manager discovery

Purpose: identify likely hiring teams from public company pages, talks, repositories, and engineering blogs.

Examples:

```text
company engineering manager observability
site:company.com/blog Splunk platform team
company SRE manager Kubernetes
```

Capture:

- public source URL
- team association
- role title
- confidence note

### Company technology signals

Purpose: find public technology adoption signals relevant to target roles.

Examples:

```text
site:company.com/blog Splunk
site:company.com/blog Kubernetes Terraform
company engineering blog Cribl observability
```

Capture:

- signal URL
- technology mentioned
- team context
- recency

## Workflow

1. Choose a target role family.
2. Select safe search pattern categories.
3. Create a manual search queue.
4. Review public results by hand.
5. Capture evidence URLs and notes.
6. Create planned state projections.
7. Decide follow-up actions manually.

## Explicit non-goals

This playbook does not implement:

- LinkedIn scraping
- proxy scraping
- CAPTCHA bypassing
- login bypass
- Gmail sync
- Calendar sync
- browser automation
- email sending
- recruiter auto-contact
- application auto-submit
- document upload

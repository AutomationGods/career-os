# Career OS Goals and Non-Goals

Career OS is an agentic career operating system, not a generic resume builder.

This page exists so future product work and agent sessions stay aligned with the original product intent.

For architecture boundaries, see `docs/ARCHITECTURE_BIBLE.md`.

For current phase status and deferred work, see `docs/ROADMAP.md`.

## Goals

Career OS should:

- analyze all existing resumes and career documents
- preserve source references for career claims
- create a truthful career profile from Profile Facts
- make job searching systematic instead of scattered
- find jobs aligned with verified background and career direction
- score opportunities before wasting time applying
- show why an opportunity is high-fit, low-fit, risky, or not worth attention
- generate application materials from verified or explicitly allowed facts
- prevent fake or exaggerated claims
- track companies, recruiters, applications, interviews, and follow-ups
- create daily career missions
- identify evidence gaps before formal claims are used
- identify skill gaps and strategy gaps
- eventually support career strategy, skill gaps, salary intelligence, and offer negotiation
- operate as an agentic career command center
- keep sensitive actions behind human approval gates
- preserve command, event, state, snapshot, and runtime audit trails

## Non-goals

Career OS is not:

- a generic resume builder
- an auto-apply spam bot
- a fake credential generator
- a LinkedIn scraper
- a CAPTCHA bypass tool
- a proxy scraping system
- an uncontrolled email sender
- an uncontrolled recruiter outreach system
- a system that invents experience
- a system that invents certifications
- a system that invents degrees
- a system that invents clearance
- a system that upgrades Public Trust into security clearance
- a system that treats every job as worth applying to
- a system that hides risk from the user
- a replacement for user judgment

## Product guardrails

The product should default to these behaviors:

- Use Profile Facts as the source of truth for career claims.
- Treat raw resumes and documents as source material, not automatic truth.
- Require evidence for strict claims before formal use.
- Separate inferred notes from resume-allowed facts.
- Show blocked and needs-evidence claims to the user.
- Prefer fewer, better opportunities over high-volume applications.
- Require approval before sensitive external actions.
- Keep disabled or placeholder domains honest in docs and UI.

## What to avoid when extending the product

Do not add a workflow that:

- bypasses the Command Bus or Orchestrator
- bypasses permission policy
- writes hidden state without events or documented projection rules
- sends email without approval
- submits applications without approval
- scrapes LinkedIn as a core behavior
- uses browser automation without an explicit gated design
- treats AI output as evidence
- claims production readiness without Runtime Audit support
- creates resume content from blocked, rejected, inferred, or needs-evidence facts

## Success criteria

Career OS is succeeding when the user can open the product and understand:

- who they are professionally based on verified facts
- what role targets make sense
- which opportunities are worth pursuing
- which opportunities should be ignored
- which application packets are ready
- which claims need evidence
- which relationships need follow-up
- which interview prep tasks matter
- what to do next today

The output is not one document.

The output is a coordinated job-search operating loop that helps the user land the right role without compromising truth.

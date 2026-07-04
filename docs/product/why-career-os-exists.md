# Why Career OS Exists

Career OS was built because job searching is not one task. It is a messy operating-system problem involving identity, truth, positioning, discovery, scoring, documents, relationships, communication, interviews, follow-up, and strategy.

Most tools solve one slice, such as resume writing or job boards. Career OS coordinates the full process through agents, commands, state, memory, evidence, and auditability.

Career OS is not a resume builder.

A resume is not the product. A resume is one artifact inside the larger career pursuit pipeline.

Career OS is the product: an agentic career operating system for turning career history, verified facts, job discovery, opportunity intelligence, application packets, recruiter relationships, interviews, follow-ups, and daily missions into one coordinated job-search pipeline.

## The user problem

The user does not start with a clean database of career truth.

The user starts with scattered material:

- multiple resumes
- old resume versions
- career notes
- project summaries
- work history
- achievements
- tools and technologies
- certifications
- education
- public trust or clearance references
- prior applications
- recruiter conversations
- preferences in memory
- role ideas that may or may not still be current

That material is useful, but it is not automatically safe to use.

Uploaded or pasted text can be stale, exaggerated, duplicated, ambiguous, or unsupported. Career OS therefore has to extract claims, preserve source references, classify truth status, and decide allowed uses before it generates application artifacts.

## Why the system starts with resumes and career documents

Existing resumes and career documents are the richest available source material for a career profile.

They contain employers, dates, projects, tools, titles, accomplishments, certifications, domains, and positioning choices that would be expensive for the user to re-enter by hand.

Career OS should use those materials as source input, not as final truth.

The correct flow is:

```text
Documents → Extracted Claims → Profile Facts → Truth Review → Career Profile → Application Artifacts
```

The system must preserve where a claim came from so the user and future agents can trace the claim back to evidence.

## Why facts come before resumes

Resume generation without a verified fact layer creates risk.

The system could accidentally invent or repeat unsupported claims about:

- employers
- employment dates
- job titles
- degrees
- certifications
- clearance
- Public Trust
- salary history
- metrics
- tools
- scope of responsibility

Career OS must first normalize claims into Profile Facts and classify whether each fact is verified, user-asserted, inferred, needs evidence, rejected, or blocked.

Only then can Resume Factory, Cover Letter, Interview Prep, Recruiter Email, and Application Packet workflows decide which facts are safe for their use case.

## Why truthfulness matters

Career OS is designed to help the user land the right role without creating fake history.

Truthfulness matters because unsupported claims can harm the user, waste time, create compliance risk, or damage recruiter trust.

The system must:

- never invent certifications
- never invent degrees
- never invent clearance
- never upgrade Public Trust into security clearance
- never invent employers, dates, titles, or metrics
- keep inferred claims out of formal documents until confirmed
- downgrade unsupported strict claims to needs-evidence
- block rejected or unsafe claims
- show the user what claims need evidence

This is why Profile Facts and Resume Factory are truth-gated domains instead of free-form document generators.

## Why Runtime Audit matters

Career OS is built on a reusable event-driven automation platform.

That platform can only be trusted if it can explain what is actually wired, what is only registered, what is placeholder-only, and what is gated or disabled.

Runtime Audit matters because it prevents the docs, UI, registry, and runtime from drifting into false claims.

A domain should not be described as active or production-ready unless runtime evidence supports that status.

For the architecture rules behind this, see `docs/ARCHITECTURE_BIBLE.md`.

For the phase foundation, see `docs/PRD.md` and `docs/ROADMAP.md`.

## Why domains, managers, commands, events, projections, and approvals exist

Career OS needs runtime boundaries because the product touches sensitive career actions.

The required pattern is:

```text
Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace
```

This pattern exists so that:

- user actions go through commands instead of hidden direct calls
- the Orchestrator can enforce permissions and approval gates
- domain managers own bounded business behavior
- workers and tools stay scoped to their domain
- events preserve what happened
- state projections expose current truth
- snapshots preserve source material
- UI workspaces read state instead of inventing state
- sensitive actions require human approval

Auto-submit, LinkedIn scraping, Gmail sending, browser automation, proxy scraping, CAPTCHA bypass, uncontrolled recruiter outreach, and uncontrolled external actions are intentionally deferred or disabled.

## What Career OS solves

Career OS makes job searching systematic instead of scattered.

It helps the user answer:

- Who am I professionally based on verified facts?
- What roles should I pursue?
- Which jobs are worth attention?
- Which jobs should I ignore?
- Which claims can safely appear in a resume?
- Which claims need evidence?
- Which application packets are ready?
- Which recruiters or relationships need follow-up?
- Which interviews need preparation?
- What is the highest-leverage next action today?

## What successful use looks like

Successful use does not mean generating more resumes.

Successful use means the user has a coordinated job-search operating loop:

1. Source materials are collected.
2. Claims are extracted with source references.
3. Profile Facts are reviewed and classified.
4. The career profile reflects truthful strengths and gaps.
5. Jobs are discovered from safe sources.
6. Opportunities are scored before the user spends time applying.
7. Application packets are generated from verified facts.
8. Recruiter relationships and follow-ups are tracked.
9. Interview prep uses truthful evidence-backed material.
10. Daily Mission tells the user what to do next.
11. Outcomes feed back into strategy.

The product outcome is not a prettier resume.

The product outcome is a verified, auditable, guided career pursuit pipeline.

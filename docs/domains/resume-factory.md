# Resume Factory Domain

Resume Factory follows Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace.

It generates review-required resume drafts from verified facts only.

## Command path

```text
/master-resume UI → Master Resume API → Command Bus → Orchestrator → IdentityManager → ProfileFactsStore
/profile-facts UI → Profile Facts API → Command Bus → Orchestrator → IdentityManager → ProfileFactsStore
/resumes UI → POST /api/resumes → Command Bus → Orchestrator → ResumeFactoryManager → TechnicalResumeWorker → TruthfulnessGuardWorker → ResumeVersionStore → Event/State/Snapshot stores
```

## Commands

- `resume.generate`
- `resume.generate_placeholder`
- `resume.templates.list`
- `resume.review_checklist.generate`

## Events

- `resume.generated`
- `resume.template_selected`
- `resume.review_checklist_created`
- `resume.placeholder_created`
- `profile_facts.used_by_resume_factory`

## State projections

- `resume.current_draft`
- `resume.review_queue`
- `resume.template_catalog`

## Local workspace

Open `http://localhost:3000/master-resume` after `npm run dev`, import sample text, and verify at least one fact.

Open `http://localhost:3000/resumes` after verified facts exist.

The page posts a safe Splunk / Cribl demo payload, lets the user choose a template, lets the user set section order, displays the structured ATS draft, shows truthfulness status, and highlights verified, missing, and blocked keywords.

## Resume Factory v2

Generated drafts include:

- Template key/name.
- Ordered sections.
- Exact verified-fact bullets.
- Missing keyword list.
- Review checklist.
- Persisted `ResumeVersion` metadata.

Every resume section bullet must exactly match a verified Profile Fact.

Needs-review facts are ignored.

Blocked claims appear as `not claimed`; they are never rendered as resume bullets.

## Safety boundary

The domain does not invent CISSP, Security+, clearance, fake employers, fake metrics, dates, tools, or experience.

The workspace does not send email, upload documents, submit applications, apply to jobs, scrape LinkedIn, or call an AI provider.

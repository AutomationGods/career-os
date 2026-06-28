# Phase 7 — Resume Factory v1

Resume Factory v1 creates truthfulness-guarded resume drafts from verified facts only.

## Implemented

- `POST /api/resumes` submits `resume.generate` through the Command Bus and Orchestrator.
- `ResumeFactoryManager` builds deterministic SHA-256 draft IDs from stable draft input.
- `TechnicalResumeWorker` copies supplied verified facts into review-required resume markdown.
- `TruthfulnessGuardWorker` blocks draft bullets that do not exactly match verified facts.
- `resume.generated` events, `resume.current_draft` state projections, and `resume.source_input` snapshots preserve the generation trail.
- `/profile-facts` provides a local source-of-truth workspace for verified resume facts and blocked claims.
- `/resumes` provides a local browser demo for a Splunk / Cribl Platform Engineer target role and uses Profile Facts when seeded.

## Local demo

1. `npm run dev`
2. Open `http://localhost:3000/profile-facts`
3. Click `Seed Initial Profile Facts`
4. Confirm verified Splunk, Cribl, DevOps, cloud, Linux, Terraform, SIEM, and observability facts appear.
5. Confirm blocked CISSP, Security+, and clearance claims appear.
6. Open `http://localhost:3000/resumes`
7. Click `Generate Demo Splunk/Cribl Resume`
8. Confirm the resume preview appears.
9. Confirm truthfulness status appears.
10. Confirm CISSP, Security+, and clearance are not invented.
11. Export Markdown and DOCX locally from `/resumes` after the draft is generated.
12. Confirm no email, upload, submit, or apply action happened.

## Demo payload

The `/resumes` page uses a safe commercial role payload:

```text
Target role: Splunk / Cribl Platform Engineer
Company: Demo Commercial Company
```

The job description includes Splunk, Cribl, SIEM, log onboarding, observability, Linux, Terraform, AWS, Azure, GCP, security data pipelines, CISSP, Security+, and no-clearance language.

Seeded Profile Facts cover Splunk, Cribl, SIEM, Linux, Terraform, AWS, Azure, GCP, log onboarding, observability, and security data pipelines.

CISSP and Security+ remain blocked claims unless verified and unblocked later.

Clearance claims remain blocked unless verified and unblocked later.

## Safety boundary

Resume Factory v1 does not send email, upload files, submit applications, apply to jobs, scrape LinkedIn, bypass CAPTCHA, call Gmail, call Calendar, export PDF, upload documents externally, or call an AI provider.

Document Export v1 later adds local-only Markdown and simple DOCX export through `document_exports.create_markdown` and `document_exports.create_docx`; those exports remain local review artifacts only.

The `/resumes` workspace is a demo/UI layer only; resume generation still flows through:

```text
UI → API → Command Bus → Orchestrator → Resume Factory Domain → Event/State/Snapshot stores
UI → API → Command Bus → Orchestrator → Document Export Domain → Event/State/Snapshot stores
```

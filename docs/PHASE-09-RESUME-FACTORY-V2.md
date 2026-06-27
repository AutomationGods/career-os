# Phase 09 — Resume Factory v2

## Goal

Resume Factory v2 produces a more usable ATS-friendly resume draft while preserving the verified-facts-only truthfulness contract.

It adds templates, section ordering, review checklists, and persisted `ResumeVersion` rows.

It still does not export, upload, email, or submit anything.

## User flow

1. Open `/master-resume` and import/verify Profile Facts.
2. Open `/resumes`.
3. Choose a template.
4. Adjust section order if needed.
5. Generate a local review draft.
6. Review keyword alignment, truthfulness guard, checklist, and preview.

## Commands

| Command | Purpose | Permission |
|---|---|---|
| `resume.generate` | Generate a local review draft and persist a `ResumeVersion`. | `generate_resume` |
| `resume.generate_placeholder` | Legacy placeholder alias that still routes through v2 truthfulness checks. | `generate_resume` |
| `resume.templates.list` | List available ATS-friendly templates. | `generate_resume` |
| `resume.review_checklist.generate` | Generate a standalone review checklist. | `generate_resume` |

## API routes

- `POST /api/resumes`
- `GET /api/resume-templates`

`POST /api/resumes` accepts:

- `templateKey`
- `sectionOrder`
- `masterResumeId`
- existing job/company/packet/profile fact fields

## Templates

Current template catalog:

- `ats-technical-v2`
- `compact-technical-v2`

Both templates use plain headings and text-only bullets for ATS compatibility.

## Section ordering

Supported section keys:

- `summary`
- `technical_skills`
- `experience_highlights`
- `certifications`
- `additional_verified_facts`

Unknown section keys are ignored.

Missing default sections are appended automatically.

## Truthfulness contract

Every resume section bullet is copied exactly from verified facts.

The truthfulness guard still rejects any section bullet that does not exactly match a verified fact.

Needs-review imported facts remain excluded.

Blocked claims are shown as `not claimed` checklist/preview context, not as resume bullets.

## Persistence

Generated drafts are saved to `ResumeVersion` with:

- `id` matching the deterministic draft id.
- `content` containing the full draft object.
- `templateKey`.
- `sectionOrder`.
- `reviewChecklist`.
- optional `masterResumeId`.

The current draft is also written to `resume.current_draft`.

Checklist state is written to `resume.review_queue`.

Template catalog reads write `resume.template_catalog`.

## Events

- `resume.generated`
- `resume.template_selected`
- `resume.review_checklist_created`
- `profile_facts.used_by_resume_factory`
- legacy `resume.placeholder_created` when using the placeholder command

## Manual demo

```bash
npm run dev
```

Then:

1. Open `http://localhost:3000/master-resume`.
2. Import sample text and verify at least one Splunk/Cribl fact.
3. Open `http://localhost:3000/resumes`.
4. Select `ATS Technical v2`.
5. Generate a draft.
6. Confirm the preview has structured sections.
7. Confirm every bullet comes from verified facts.
8. Confirm the review checklist appears.
9. Confirm CISSP, Security+, clearance, fake employers, fake dates, and fake metrics are not claimed.

## Forbidden actions

This phase must not add:

- AI provider calls.
- PDF/DOCX export.
- External upload.
- Email sending.
- Application submission.
- Browser automation.

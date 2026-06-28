# Resume Factory Demo

Use this page to test Resume Factory v2 visually without sending, uploading, submitting, or applying to anything.

## Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000/master-resume
http://localhost:3000/profile-facts
http://localhost:3000/resumes
```

## Demo steps

1. Open `http://localhost:3000/master-resume`.
2. Click `Import + Safety Blocks`.
3. Verify at least one Splunk or Cribl fact.
4. Open `http://localhost:3000/profile-facts`.
5. Confirm verified resume facts, needs-review facts, and blocked claims appear.
6. Open `http://localhost:3000/resumes`.
7. Confirm the page title says `Resume Factory`.
8. Select `ATS Technical v2` or `Compact Technical v2`.
9. Adjust the section-order text if desired.
10. Click `Generate Demo Splunk/Cribl Resume`.
11. Confirm a command status appears.
12. Confirm a persisted version ID appears.
13. Confirm a structured ATS-friendly resume preview appears.
14. Confirm the review checklist appears.
15. Confirm truthfulness status appears.
16. Confirm keyword alignment appears.
17. Confirm CISSP, Security+, and clearance are not invented.
18. Click `Export Markdown` and confirm a local document export ID appears.
19. Click `Export DOCX` and confirm a local document export ID appears.
20. Download both files and confirm blocked claims are absent.
21. Confirm no email, upload, submit, or apply action happened.

## Expected keyword behavior

Verified matches should include:

- Splunk
- Cribl
- SIEM
- Linux
- Terraform
- AWS
- Azure
- GCP

Missing/preferred keywords should include:

- CISSP
- Security+

Blocked/no-claim keywords should include clearance-sensitive terms such as:

- active clearance
- Secret
- Top Secret
- TS/SCI
- Public Trust
- Polygraph

## v2 template behavior

The preview should show ordered sections such as Professional Summary, Technical Skills, Experience Highlights, Certifications, and Additional Verified Facts.

Every bullet should be copied from verified facts.

Blocked claims should appear as not claimed, not as resume bullets.

## Safety limits

The demo is intentionally API-backed and local-review-only.

It does not implement Gmail sync, Google Calendar sync, email sending, Chrome extension behavior, browser autofill, auto-submit, LinkedIn scraping, proxy scraping, CAPTCHA bypassing, recruiter outreach, document upload, external document submission, PDF export, or AI provider calls.

DOCX export is local-only and intentionally simple: paragraphs only, no graphics, no hidden custom metadata, and no tables.

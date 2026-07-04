# Resume to Career Profile Process

Career OS should treat resumes and career documents as source material, not as final truth.

The goal is to turn scattered career material into a usable, evidence-aware career profile that can safely drive job discovery, fit scoring, application packets, resumes, recruiter communication drafts, interview prep, and daily missions.

This document extends the product intent behind Profile Facts and Resume Factory. It does not replace the architecture rules in `docs/ARCHITECTURE_BIBLE.md` or the current runtime notes in `docs/domains/profile-facts.md` and `docs/domains/resume-factory.md`.

## Phase 1: Resume and Document Collection

Collect the user's existing career material before asking the system to generate new artifacts.

Material can include:

- all resumes
- old resume versions
- cover letters
- career notes
- project summaries
- certifications
- education records
- work history notes
- prior applications
- public trust or clearance facts
- tools and technologies
- portfolio notes
- recruiter notes
- salary preferences
- remote, hybrid, or on-site preferences
- target role preferences
- industry preferences

Rules:

- Preserve source references.
- Preserve document names, dates, and user-provided context when available.
- Keep snapshots of source material where the runtime supports it.
- Do not treat uploaded text as automatically verified.
- Do not assume old resume text is still current.
- Do not generate formal application material directly from raw document text.

Expected platform objects:

- source snapshots for original material
- extraction events for claims found
- state projections for current Profile Facts after review

## Phase 2: Claim Extraction

Claim extraction turns documents into candidate career claims.

The extraction process should identify:

- employers
- job titles
- employment dates
- skills
- tools
- platforms
- projects
- achievements
- metrics
- certifications
- education
- public trust references
- clearance references
- industries
- domains
- salary preferences
- work preferences
- remote, hybrid, and on-site preferences
- location preferences
- role targets

Extraction is not verification.

A claim extracted from a resume means only: "this claim appeared in source material." It does not mean the claim is safe for every use.

Risks to avoid:

- merging separate employers incorrectly
- assuming a tool mention means expert proficiency
- inferring certifications from skill keywords
- treating preferred qualifications in a job description as user credentials
- turning Public Trust into security clearance
- turning a project metric into an employment-wide metric
- copying old dates without evidence

## Phase 3: Profile Facts

Profile Facts are the normalized career claims that Career OS can reason over.

Each Profile Fact should track:

- claim text
- normalized claim text
- category
- truth status
- source type
- source reference
- evidence summary
- confidence
- allowed uses
- blocked uses
- timestamps

Truth status values:

- `verified`
- `user_asserted`
- `inferred`
- `needs_evidence`
- `rejected`
- `blocked`

Allowed uses:

- `resume`
- `cover_letter`
- `recruiter_email`
- `interview_prep`
- `career_strategy`
- `application_packet`

The system should also track blocked uses.

Strict categories require evidence before formal use:

- certifications
- degrees and education claims
- clearance claims
- employment dates
- job titles

A fact may be useful for interview preparation or career strategy while still being blocked from a resume.

Example:

- "Likely has fintech exposure" may help career strategy as an inferred note.
- It must not appear in a formal resume unless the user confirms it and allowed use changes.

## Phase 4: Truth Review

Truth Review decides which claims can safely be used.

The system should:

- downgrade unsupported verified claims to `needs_evidence`
- block fake or unsafe claims
- mark careful phrasing requirements for `user_asserted` facts
- exclude inferred claims from formal documents until explicitly confirmed
- require evidence for strict categories
- keep source references attached
- expose missing evidence to the user

The system must not:

- invent certifications
- invent degrees
- invent clearance
- upgrade Public Trust into security clearance
- invent employers
- invent employment dates
- invent job titles
- invent metrics
- treat preferred job-description qualifications as user facts
- silently convert blocked facts into usable resume claims

Truth Review should produce visible diagnostics for the user and internal diagnostics for Runtime Audit and future agent sessions.

## Phase 5: Career Profile

The Career Profile is the usable view built from Profile Facts.

It should help identify:

- strongest role targets
- strongest positioning angles
- strongest verified skills
- strongest verified achievements
- safe resume facts
- safe cover-letter facts
- safe interview facts
- safe recruiter-message facts
- facts needing evidence
- claims blocked from formal use
- gaps in evidence
- gaps in skills
- unclear employment history
- unclear certifications or education
- role targets that fit the user's verified background

The Career Profile should not be a free-form biography.

It is the operating state that powers Career OS workflows.

## Output of this process

After this process, Career OS should have enough truth-aware state to support:

- job discovery queries
- opportunity intelligence
- fit scoring
- application packet creation
- resume drafts from allowed facts
- cover letter drafts from allowed facts
- recruiter communication drafts with approval gates
- interview preparation from truthful evidence
- follow-up planning
- career strategy
- Daily Mission recommendations

The resume is an artifact produced from this profile.

The verified career profile is the source of truth.

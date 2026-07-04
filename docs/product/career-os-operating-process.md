# Career OS Operating Process

Career OS coordinates a full job-search operating loop.

The current implementation covers only parts of this loop. This document describes the intended product process so future domains, agents, and UI workspaces extend the same model instead of treating any single artifact as the product.

Architecture rule: every active workflow must respect the boundary documented in `docs/ARCHITECTURE_BIBLE.md`:

```text
Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace
```

## 1. Career Goal

What it does:

- captures what the user wants next
- defines target roles, constraints, salary goals, remote preferences, geography, industries, and risk tolerance
- sets the direction for discovery and scoring

Likely owning domains:

- Career Strategy Domain
- Mission Domain
- Profile Facts Domain for factual constraints

State it should produce:

- current career goal projection
- target role preferences
- search constraints

Events it should emit:

- `career_goal.created`
- `career_goal.updated`
- `career_goal.archived`

Risks to avoid:

- treating vague preferences as verified facts
- overwriting user intent without approval
- pushing jobs that violate hard constraints

What the user sees:

- target roles
- constraints
- current search strategy
- highest-priority career direction

## 2. Resume / Document Ingestion

What it does:

- collects all resumes and career documents
- snapshots source material
- preserves document provenance

Likely owning domains:

- Document Intelligence Domain
- Snapshot Store
- Profile Facts Domain after extraction

State it should produce:

- document source snapshots
- ingestion status
- source reference index

Events it should emit:

- `career_document.ingested`
- `career_document.snapshot_captured`
- `career_document.ingestion_failed`

Risks to avoid:

- treating document text as verified truth
- losing source references
- mixing source documents without traceability

What the user sees:

- uploaded or collected source list
- extraction status
- source warnings

## 3. Profile Fact Extraction

What it does:

- extracts candidate claims from resumes and documents
- normalizes claims into Profile Facts
- records truth status, allowed uses, blocked uses, and evidence summary

Likely owning domains:

- Profile Facts Domain
- Document Intelligence Domain
- Knowledge or Memory Domain for non-formal notes where appropriate

State it should produce:

- `profile_facts.current`
- extraction diagnostics

Events it should emit:

- `profile_fact.upsert_started`
- `profile_fact.truth_status_classified`
- `profile_fact.upserted`
- `profile_fact.rejected`
- `profile_fact.blocked`

Risks to avoid:

- inventing credentials
- inferring certifications from tool usage
- upgrading Public Trust into clearance
- allowing inferred facts into formal documents

What the user sees:

- extracted facts
- truth status
- allowed and blocked uses
- evidence gaps

## 4. Truth Review

What it does:

- reviews strict claims before formal use
- downgrades unsupported claims to needs-evidence
- blocks rejected or unsafe claims

Likely owning domains:

- Profile Facts Domain
- Trust & Safety Domain
- Resume Factory for resume-specific claim policy

State it should produce:

- updated Profile Facts
- blocked-use lists
- evidence-required lists

Events it should emit:

- `profile_fact.truth_status_classified`
- `profile_fact.rejected`
- `profile_fact.blocked`
- `resume.claim_blocked` when filtering resume claims

Risks to avoid:

- hiding blocked claims from the user
- silently upgrading user assertions
- treating old resume claims as verified

What the user sees:

- facts ready for use
- facts needing evidence
- blocked or rejected claims
- careful phrasing warnings

## 5. Career Profile

What it does:

- turns Profile Facts into a usable professional profile
- identifies strongest roles, positioning, strengths, gaps, and safe claims

Likely owning domains:

- Career Strategy Domain
- Profile Facts Domain
- Skill Gap Intelligence Domain

State it should produce:

- career profile projection
- positioning summary
- gap analysis

Events it should emit:

- `career_profile.created`
- `career_profile.updated`
- `career_profile.gap_identified`

Risks to avoid:

- summarizing unsupported claims as truth
- hiding weak evidence
- overfitting to one resume version

What the user sees:

- truthful profile summary
- target role recommendations
- gaps and evidence needs

## 6. Job Discovery

What it does:

- searches safe public sources
- preserves source attribution and links
- captures source snapshots

Likely owning domains:

- Job Discovery Domain
- Job Normalization Domain
- Snapshot Store

State it should produce:

- `job.discovery_run`
- imported job records
- source snapshots

Events it should emit:

- `job.discovery_started`
- `job.discovery_completed`
- `job.discovery_failed`

Risks to avoid:

- scraping prohibited sources
- LinkedIn scraping
- proxy scraping
- CAPTCHA bypassing
- submitting applications from discovery

What the user sees:

- discovered jobs
- source names
- source links
- search filters and counts

## 7. Job Intelligence

What it does:

- normalizes job data
- classifies remote status, clearance/government segment, application difficulty, and relevant requirements

Likely owning domains:

- Job Intelligence Domain
- Job Normalization Domain
- Remote Classification Domain
- Clearance Segmentation Domain
- Application Difficulty Domain

State it should produce:

- `job.dashboard_segment`
- normalized job summaries
- classification fields

Events it should emit:

- `job.pipeline_completed`
- `job.pipeline_failed`

Risks to avoid:

- mislabeling Public Trust or clearance requirements
- hiding missing requirements
- treating job description preferences as user facts

What the user sees:

- normalized title/company/location
- remote classification
- clearance segment
- application difficulty
- matched and missing signals

## 8. Fit Scoring

What it does:

- compares job requirements against verified Profile Facts and career goals
- estimates whether the opportunity deserves attention

Likely owning domains:

- Fit Scoring Domain
- Opportunity Intelligence Domain
- Profile Facts Domain as source of truth

State it should produce:

- fit score
- matched skills
- missing skills
- scoring explanation

Events it should emit:

- `fit_score.created`
- `fit_score.updated`

Risks to avoid:

- encouraging low-fit spam applications
- treating every job as worth applying to
- using blocked facts to inflate fit

What the user sees:

- score
- reasons
- missing requirements
- recommendation to pursue or ignore

## 9. Career Opportunity

What it does:

- connects job, company, fit, status, artifacts, relationships, communication, interviews, follow-up, and mission priority
- becomes the central pipeline object for a pursuit

Likely owning domains:

- Opportunity Intelligence Domain
- Application Packet Domain
- Relationship Intelligence Domain
- Mission Domain

State it should produce:

- career opportunity projection
- opportunity status
- next action
- mission priority

Events it should emit:

- `career_opportunity.created`
- `career_opportunity.updated`
- `career_opportunity.closed`

Risks to avoid:

- duplicating opportunities for the same job without linking them
- losing source attribution
- advancing status without user intent

What the user sees:

- opportunity workspace
- status
- priority
- next action
- connected artifacts and relationships

## 10. Application Packet

What it does:

- creates a pursuit artifact for a selected opportunity
- groups job, company, fit summary, resume draft, cover letter draft, recruiter message draft, notes, status, and next action

Likely owning domains:

- Application Packet Domain
- Resume Factory Domain
- Cover Letter Domain
- Document Export Domain

State it should produce:

- `application_packet.current`
- `resume.current_draft`
- document export metadata

Events it should emit:

- `application_packet.created`
- `application_packet.updated`
- `resume.profile_facts_loaded`
- `resume.claims_filtered`
- `resume.generated`
- `document.local_exported`

Risks to avoid:

- generating artifacts from unsupported facts
- external upload or submission without approval
- treating local export as application submission

What the user sees:

- packet detail page
- generated local-review artifacts
- status controls
- safe export link

## 11. Relationship Tracking

What it does:

- tracks companies, recruiters, contacts, and deduped people
- connects relationships to opportunities and applications

Likely owning domains:

- Relationship Intelligence Domain
- Company Intelligence Domain
- User CRM Domain

State it should produce:

- `relationship.person`
- company/contact relationship projections

Events it should emit:

- `relationship.deduplicated`
- `relationship.updated`
- `company.relationship_updated`

Risks to avoid:

- contacting recruiters without approval
- inventing contact history
- scraping LinkedIn

What the user sees:

- contacts
- relationship notes
- follow-up needs
- connected opportunities

## 12. Communications Drafting

What it does:

- drafts recruiter messages, follow-ups, and email content from allowed facts
- routes sensitive communication through approval gates before sending

Likely owning domains:

- Communications Domain
- Email Intelligence Domain
- Follow-Up Automation Domain
- Approval service through the platform

State it should produce:

- communication draft state
- approval request state
- replay state where applicable

Events it should emit:

- `communication.draft_created`
- `approval.requested`
- `email.send.demo_replayed` for demo-only replay

Risks to avoid:

- sending email without approval
- contacting recruiters for the first time without approval
- making unsupported claims in messages

What the user sees:

- drafts
- approval prompts
- replay status
- communication history

## 13. Interview Pipeline

What it does:

- prepares the user for interviews using verified achievements, projects, tools, and role-specific requirements
- tracks interview stages and prep tasks

Likely owning domains:

- Interview Preparation Domain
- Interview Follow-Up Domain
- Calendar Intelligence Domain when enabled and approved

State it should produce:

- interview prep projection
- interview stage/status
- interview follow-up tasks

Events it should emit:

- `interview.prep_created`
- `interview.stage_updated`
- `interview.follow_up_created`

Risks to avoid:

- inventing stories
- using blocked facts in interview answers
- writing calendar events without approval

What the user sees:

- interview prep plan
- story bank from verified facts
- gaps to review
- follow-up reminders

## 14. Follow-Up

What it does:

- tracks follow-up due dates and next contact actions
- keeps application momentum visible

Likely owning domains:

- Follow-Up Automation Domain
- Mission Domain
- Relationship Intelligence Domain

State it should produce:

- follow-up queue
- due dates
- next action

Events it should emit:

- `follow_up.created`
- `follow_up.due`
- `follow_up.completed`

Risks to avoid:

- auto-sending follow-ups
- spamming recruiters
- hiding overdue items

What the user sees:

- due follow-ups
- recommended next message
- manual completion controls

## 15. Offer / Outcome

What it does:

- tracks offers, rejections, withdrawals, salary signals, negotiation notes, and final outcome
- feeds learning back into strategy

Likely owning domains:

- Offer Negotiation Domain
- Salary Intelligence Domain
- Finance Domain
- Career Strategy Domain

State it should produce:

- outcome projection
- offer details
- compensation comparison
- lessons learned

Events it should emit:

- `offer.received`
- `offer.updated`
- `application.rejected`
- `application.withdrawn`
- `career_outcome.recorded`

Risks to avoid:

- treating estimates as offers
- hiding tradeoffs
- making financial claims without evidence

What the user sees:

- offer/outcome state
- compensation notes
- negotiation tasks
- decision support

## 16. Daily Mission Feedback Loop

What it does:

- turns the full pipeline into daily prioritized action
- updates priorities as facts, jobs, packets, relationships, interviews, and outcomes change

Likely owning domains:

- Mission Domain
- Opportunity Intelligence Domain
- Career Strategy Domain

State it should produce:

- `daily_mission.current_queue`
- mission priorities
- next actions

Events it should emit:

- `daily_mission.generated`
- `mission.item_completed`
- `mission.feedback_recorded`

Risks to avoid:

- recommending unsafe external actions
- over-prioritizing low-fit jobs
- ignoring blocked claims or evidence gaps

What the user sees:

- best opportunities to pursue
- applications to complete
- follow-ups due
- interview prep tasks
- blocked claims needing evidence
- jobs to ignore
- highest-leverage next action

## Operating rule

Every phase should either improve the user's truth source, improve opportunity selection, improve application readiness, improve relationship/interview momentum, or improve daily prioritization.

If a workflow only produces another document without improving the operating loop, it is not aligned with Career OS.

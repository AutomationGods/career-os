# Career OS Core Pipeline

Career OS is organized around a central career pursuit pipeline.

The pipeline starts with career intent and source materials. It ends with outcomes and learning that feed back into daily missions.

## Core pipeline

```text
Career Goal
→ Resume/Document Ingestion
→ Profile Facts
→ Career Profile
→ Job Discovery
→ Job Intelligence
→ Fit Scoring
→ Career Opportunity
→ Application Packet
→ Relationship / Communication
→ Interview
→ Follow-Up
→ Offer / Outcome
→ Daily Mission feedback loop
```

This pipeline is the product spine.

A resume is an artifact.

An application packet is a pursuit artifact.

A Career Opportunity is the central pipeline object.

The Daily Mission is the operating interface.

Career OS is the overall operating system.

## Central objects

### Career Goal

The user's current target direction.

It should include role targets, constraints, preferences, compensation goals, geography, remote/hybrid/on-site preferences, and strategy notes.

### Source Material

The resumes, documents, notes, prior applications, certifications, project summaries, and other source references that seed the profile.

Source material should be snapshotted or referenced. It should not be treated as automatic truth.

### Profile Facts

The verified and constrained career claims extracted from source material and user input.

Profile Facts are the source of truth for formal career claims.

They track truth status, allowed uses, blocked uses, source references, and evidence.

### Career Profile

A usable view of the user's professional identity based on Profile Facts.

It should summarize strengths, role targets, positioning angles, gaps, safe resume facts, safe interview facts, and evidence needs.

### Job

An observed listing from a source.

It should preserve source attribution, source URL, normalized title/company/location, and source snapshot.

### Career Opportunity

Career Opportunity should become the central object connecting:

- job
- company
- source
- fit score
- salary estimate
- remote status
- clearance/government segment
- application difficulty
- required skills
- missing skills
- resume draft
- cover letter draft
- recruiter contacts
- communication history
- follow-up schedule
- interview events
- status
- next action
- mission priority

Career Opportunity is the operational record for deciding whether and how to pursue a role.

It is broader than a job listing and broader than an application packet.

### Application Packet

A packet is the pursuit artifact for a selected opportunity.

It can contain:

- selected job
- selected company
- fit summary
- resume draft
- cover letter draft
- recruiter message draft
- notes
- status
- next action
- local export metadata

The packet is important, but it is not the whole pipeline.

### Resume Draft

A resume draft is an artifact generated from allowed Profile Facts.

It should record:

- used fact IDs
- blocked fact IDs
- needs-evidence fact IDs
- truthfulness summary
- source snapshot
- review-required status

The resume draft must not invent facts.

### Communication Draft

A communication draft is a proposed recruiter email, follow-up, or outreach message.

It must use allowed facts and require approval before sensitive external actions.

### Interview Event

An interview event tracks scheduled or completed interview activity and related preparation.

Interview prep should draw from verified facts and evidence-backed stories.

### Follow-Up

A follow-up item tracks a due action after an application, recruiter conversation, interview, or offer event.

Follow-up automation must not auto-send messages without approval.

### Offer / Outcome

The final or intermediate result of a pursuit.

It should record offers, rejections, withdrawals, compensation notes, negotiation state, and lessons learned.

## Why Career Opportunity should be central

A job listing alone does not represent a pursuit.

A resume draft alone does not represent a pursuit.

An application packet alone does not capture relationship status, follow-up timing, interview events, or mission priority.

Career Opportunity is the object that can connect all of these into one operating record.

It should answer:

- What is this opportunity?
- Why does it fit or not fit?
- What evidence supports the fit?
- What materials are ready?
- Who is connected to it?
- What has happened so far?
- What is blocked?
- What should happen next?
- Should it be part of today's mission?

## Daily Mission feedback loop

Daily Mission should read the current pipeline state and produce prioritized action.

Inputs include:

- career goal
- Profile Facts
- opportunity scores
- packet statuses
- blocked claims
- follow-up dates
- interview tasks
- relationship tasks
- outcomes

Outputs include:

- opportunities to pursue
- applications to complete
- follow-ups due
- recruiter relationships to warm up
- interview prep tasks
- blocked claims needing evidence
- jobs to ignore
- highest-leverage next action

## Implementation note

The current codebase has working pieces of this pipeline, including job discovery, job intelligence, application packets, resume generation, state stores, event stores, snapshots, approvals, and runtime audit.

Future work should extend the central Career Opportunity model without bypassing the existing architecture or enabling deferred external actions.

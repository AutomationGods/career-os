# Phase 5 — Human Approval Gates

Phase 5 adds the first real control layer for Career OS.

Sensitive commands now pass through permission policy before any domain manager, worker, or tool executes.

## Execution path

```text
Command Bus
→ Orchestrator
→ Permission Policy
→ Approval Request Service when needed
→ Domain Manager only when allowed
→ Event Store
```

## Permission decisions

The permission policy returns one of:

- `allowed`
- `denied`
- `requires_approval`

Allowed commands execute normally.

Denied commands return `rejected` and do not execute.

Approval-required commands create an `ApprovalRequest`, emit approval lifecycle events, return `requires_approval`, and do not execute.

## Approval-required permissions

These permissions require approval by default:

- `send_email`
- `submit_application`
- `upload_file`
- `contact_recruiter`
- `contact_recruiter_first_time`
- `answer_sensitive_questions`
- `modify_master_profile`
- `use_browser`
- `export_document_for_submission`
- `auto_send_followup`
- `write_calendar`

Development-safe permissions currently allowed by default include `read_jobs`, `write_jobs`, `generate_resume`, `export_document`, `create_followup`, and `schedule_followup`.

## Approval lifecycle events

- `approval.requested`
- `approval.approved`
- `approval.rejected`
- `approval.expired`
- `approval.cancelled`
- `command.requires_approval`
- `command.approval_granted`
- `command.approval_denied`

## API routes

- `GET /api/approvals`
- `GET /api/approvals/:id`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `POST /api/approvals/:id/cancel`

## UI

`/approvals` shows pending, approved, and rejected approval requests with command type, permission, risk, reason, entity, and requested date.

## Trusted mode

Trusted mode placeholders exist, but trusted mode is disabled.

Auto-send and auto-submit remain disabled and are not implemented.

## Non-goals

This phase does not add Gmail sync, Calendar sync, browser automation, Chrome extension, LinkedIn scraping, email sending, document upload, recruiter outreach, or auto-submit behavior.

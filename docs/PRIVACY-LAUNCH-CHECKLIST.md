# Privacy Launch Checklist

Career OS public launch cannot proceed until every item below is checked by the launch owner.

## Data inventory

- [ ] Export includes Jobs and job pipeline evidence owned by the signed-in user.
- [ ] Export includes Application Packets and manual status tracking records.
- [ ] Export includes Profile Facts and Master Resume imports.
- [ ] Export includes generated Resume Versions and Document Exports.
- [ ] Export includes Events, State Projections, Snapshots, and Approval Requests scoped to the user.
- [ ] Export excludes other users' data in route tests and manual verification.

## Deletion and retention

- [ ] `/api/privacy/delete` requires an authenticated same-origin request.
- [ ] Deletion requires the exact confirmation phrase: `DELETE_MY_CAREER_OS_DATA`.
- [ ] Deletion removes launch-scope user data from jobs, packets, profile facts, resumes, documents, approvals, events, state, and snapshots.
- [ ] Backups retain deleted data for the documented backup window only.
- [ ] Backup restore runbook includes a delete-replay step for users deleted after the backup timestamp.

## Legal placeholders

- [ ] Privacy Policy has been reviewed by counsel before public launch.
- [ ] Terms of Service has been reviewed by counsel before public launch.
- [ ] Data Processing Addendum posture has been reviewed before serving business users.
- [ ] Cookie notice reflects the actual analytics/support tools enabled at launch.

## User controls

- [ ] Settings page links to privacy export and deletion controls.
- [ ] Export downloads a user-readable JSON file.
- [ ] Deletion response returns counts for auditability.
- [ ] Support contact path exists for deletion/export failures.

## Operational proof

- [ ] User A cannot export User B data.
- [ ] User A cannot delete User B data.
- [ ] Production logs do not include resume text, document bodies, secrets, or raw OAuth tokens.
- [ ] Incident runbook includes user-notification criteria for privacy incidents.

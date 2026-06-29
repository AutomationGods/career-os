# Incident Runbook

## Severity levels

- **SEV-1:** Cross-user data exposure, auth bypass, data deletion failure, production outage.
- **SEV-2:** Degraded apply-loop functionality, readiness failure, worker failure, migration issue.
- **SEV-3:** Non-critical UI issue, placeholder exposure without data access, documentation drift.

## First 15 minutes

1. Assign an incident commander.
2. Capture start time, commit SHA, deployment ID, and affected route/domain.
3. Stop risky automation first: workers, dev commands, external collectors.
4. Preserve logs without copying secrets, resume text, OAuth tokens, or document bodies.
5. Decide whether to rollback using `docs/DEPLOYMENT.md`.

## Privacy or auth incident

1. Disable traffic to affected routes.
2. Rotate affected secrets.
3. Query audit data by user ID and timestamp.
4. Identify impacted users.
5. Notify counsel before external notification.
6. Re-run user-scoping tests before re-enabling traffic.

## Data-loss incident

1. Freeze writes if continued writes can worsen loss.
2. Restore into a separate database first.
3. Compare affected user records.
4. Replay privacy deletions after restore.
5. Promote restore only after owner approval.

## Closure

- Write timeline.
- Record root cause.
- Add or update a test that would have caught the issue.
- Update the relevant runbook.
- Re-check `docs/LAUNCH-READINESS.md` before declaring launch posture restored.

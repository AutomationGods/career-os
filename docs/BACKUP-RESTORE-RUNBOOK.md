# Backup and Restore Runbook

## Backup schedule

- Run a full PostgreSQL backup at least daily.
- Retain backups for the documented retention window only.
- Store backups encrypted at rest.
- Keep restore credentials separate from app runtime credentials.

## Backup command

```bash
pg_dump "$DATABASE_URL" --format=custom --file="career-os-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

## Restore drill

Run a restore drill before public launch and after every schema migration batch.

```bash
createdb career_os_restore_drill
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists career-os-YYYYMMDDTHHMMSSZ.dump
npm run prisma:deploy
```

## Post-restore privacy replay

After restoring a production backup:

1. Identify all account deletions requested after the backup timestamp.
2. Re-run deletion for each affected user with `PrivacyService.deleteUserData(userId)` from a controlled admin script.
3. Confirm `/api/privacy/export` for each deleted user returns no launch-scope user records.
4. Log the replay timestamp and operator.

## Failure handling

- If backup creation fails, page the launch owner.
- If restore fails, freeze deploys until a successful restore drill passes.
- If a restored backup reintroduces deleted user data, treat it as a privacy incident and run `docs/INCIDENT-RUNBOOK.md`.

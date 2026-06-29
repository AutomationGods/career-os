# Privacy Operations Runbook

## User data export

1. User signs in.
2. User opens `/settings`.
3. User clicks **Download JSON Export**.
4. System calls `GET /api/privacy/export` using the authenticated session.
5. Operator support path: reproduce with the user's ID only in a controlled admin shell; do not email raw export data.

## User data deletion

1. User signs in.
2. User opens `/settings`.
3. User exports data first if they need a copy.
4. User types `DELETE_MY_CAREER_OS_DATA`.
5. System calls `POST /api/privacy/delete` using same-origin session credentials.
6. Response returns deletion counts for audit.

## Manual support deletion

Use only when the self-service path is unavailable.

```ts
import { PrivacyService } from "@career-os/domains";

await new PrivacyService().deleteUserData("USER_ID");
```

Record:

- user ID
- request timestamp
- operator
- deletion result counts
- backup replay requirement

## Logs and data handling

- Do not paste resume text, document bodies, OAuth tokens, session cookies, or database URLs into tickets.
- Use user IDs and record IDs for troubleshooting.
- Treat event/state/snapshot payloads as private user data.

## Legal review gate

Before public launch, counsel must approve:

- Privacy Policy
- Terms of Service
- Cookie notice
- DPA posture for business users

# Deployment Runbook

## Purpose

Ship Career OS public-launch builds without exposing demo routes, placeholder domains, or unscoped user data.

## Required environment

Set these before boot:

- `DATABASE_URL` — PostgreSQL URL.
- `REDIS_URL` — Redis URL.
- `NEXTAUTH_SECRET` or `AUTH_SECRET` — generated with `openssl rand -base64 32`.
- `NEXTAUTH_URL` — HTTPS public origin.
- `ALLOWED_ORIGINS` — comma-separated HTTPS origins allowed for same-origin mutation checks.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — production OAuth client.
- `ENABLE_DEV_COMMANDS=false`.
- `ENABLE_PLACEHOLDER_DOMAINS=false`.
- `ENABLE_EXTERNAL_COLLECTORS=false`.
- `ENABLE_PRODUCTION_DEMO_DATA=false`.

## Deploy steps

1. Build the image from the repository root:

   ```bash
   docker build --target web -t career-os-web:$(git rev-parse --short HEAD) .
   docker build --target worker -t career-os-worker:$(git rev-parse --short HEAD) .
   ```

2. Run migrations before replacing web traffic:

   ```bash
   npm ci
   npm run prisma:generate
   npm run prisma:deploy
   ```

3. Start the web container.

4. Verify liveness:

   ```bash
   curl -fsS https://YOUR_DOMAIN/api/health
   ```

5. Verify readiness:

   ```bash
   curl -fsS https://YOUR_DOMAIN/api/ready
   ```

6. Start the worker container only when Redis readiness is green.

7. Smoke-test the MVP loop with a fresh account:

   `Jobs → Application Packets → Profile Facts / Master Resume → Resume Factory → Documents → manual status tracking`

## Rollback

1. Route traffic back to the previous web image.
2. Keep the database on the migrated schema unless a tested down-migration exists.
3. Stop the new worker image.
4. Record the rollback reason and commit SHA in the incident log.

## Release gates

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run prisma:validate`
- `npm run prisma:deploy` against a clean database
- `npm run build`
- `npm run audit:deps`

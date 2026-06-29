# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domains/package.json packages/domains/package.json
COPY packages/events/package.json packages/events/package.json
COPY packages/orchestration/package.json packages/orchestration/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/snapshots/package.json packages/snapshots/package.json
COPY packages/state/package.json packages/state/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS build
ENV DATABASE_URL=postgresql://career_os:career_os@localhost:5432/career_os?schema=public \
  REDIS_URL=redis://localhost:6379 \
  NEXTAUTH_SECRET=build-only-secret-with-at-least-32-characters \
  NEXTAUTH_URL=https://localhost:3000 \
  ALLOWED_ORIGINS=https://localhost:3000 \
  AUTH_ALLOWED_EMAILS=build@example.com \
  GOOGLE_CLIENT_ID=build-google-client-id \
  GOOGLE_CLIENT_SECRET=build-google-client-secret
COPY . .
RUN npm run prisma:generate
RUN npm run build -w @career-os/web

FROM base AS web
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@career-os/web"]

FROM base AS worker
ENV NODE_ENV=production
COPY --from=build /app /app
CMD ["npm", "run", "start", "-w", "@career-os/worker"]

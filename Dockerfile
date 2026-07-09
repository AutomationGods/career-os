# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
RUN --mount=type=cache,target=/app/node_modules \
    npm ci

FROM deps AS build
RUN npx prisma generate
RUN --mount=type=cache,target=/app/apps/web/.next \
    npm run build -w @career-os/web

FROM base AS runner
ENV NODE_ENV=production

# Non-root user
RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home careeros
USER careeros

COPY --from=build --chown=careeros:nodejs /app/package.json /app/package-lock.json ./
COPY --from=build --chown=careeros:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=careeros:nodejs /app/apps ./apps
COPY --from=build --chown=careeros:nodejs /app/packages ./packages
COPY --from=build --chown=careeros:nodejs /app/prisma ./prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start", "-w", "@career-os/web"]

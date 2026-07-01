-- Make StateProjection identity user-scoped so public source IDs can be reused safely per user.
ALTER TABLE "StateProjection" ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT '__global__';

UPDATE "StateProjection"
SET "scopeKey" = COALESCE("userId", '__global__');

DROP INDEX "StateProjection_projectionType_entityType_entityId_key";

CREATE UNIQUE INDEX "StateProjection_scopeKey_projectionType_entityType_entityId_key"
ON "StateProjection"("scopeKey", "projectionType", "entityType", "entityId");

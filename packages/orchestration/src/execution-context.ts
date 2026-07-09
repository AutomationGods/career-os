import { prismaEventStore } from "@career-os/events";
import { prismaSnapshotStore } from "@career-os/snapshots";
import { prismaStateStore } from "@career-os/state";
import { PrismaApprovalRequestService } from "./approvals";
import { PermissionPolicyService } from "./permissions";
import type { OrchestratorContext } from "./orchestrator";

/**
 * Creates a Prisma-backed execution context for use by both API routes and BullMQ workers.
 * Singleton stores — Prisma client manages connection pooling internally.
 */
export function createPrismaExecutionContext(): OrchestratorContext {
  return {
    eventStore: prismaEventStore,
    stateStore: prismaStateStore,
    snapshotStore: prismaSnapshotStore,
    permissions: new PermissionPolicyService(),
    approvals: new PrismaApprovalRequestService(prismaEventStore),
  };
}

import { InMemoryEventStore } from "@career-os/events";
import { createApprovedReplayCommandBus, createOrchestrator, localApprovalRequestService, PermissionPolicyService } from "@career-os/orchestration";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { replayApproval } from "../../_handlers";

function createLocalReplayCommandBus() {
  const orchestrator = createOrchestrator({
    eventStore: new InMemoryEventStore(),
    stateStore: new InMemoryStateStore(),
    snapshotStore: new InMemorySnapshotStore(),
    permissions: new PermissionPolicyService(),
    approvals: localApprovalRequestService
  });
  return createApprovedReplayCommandBus(orchestrator);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return replayApproval(localApprovalRequestService, createLocalReplayCommandBus(), (await params).id, request);
}

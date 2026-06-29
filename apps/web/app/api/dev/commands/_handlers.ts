import { readFeatureFlags } from "@career-os/config";
import { InMemoryEventStore } from "@career-os/events";
import { localApprovalRequestService, PermissionPolicyService, createCommand, createCommandBus, createOrchestrator, type CommandBus } from "@career-os/orchestration";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { commandResult, fail } from "../../_lib/responses";

function devCommandsBlocked() {
  return process.env.NODE_ENV === "production" && !readFeatureFlags().ENABLE_DEV_COMMANDS;
}

function devCommandsBlockedResponse() {
  return fail("Not found.", "NOT_FOUND", 404);
}

export function createLocalApprovalDemoCommandBus() {
  const eventStore = new InMemoryEventStore();
  const orchestrator = createOrchestrator({
    eventStore,
    stateStore: new InMemoryStateStore(),
    snapshotStore: new InMemorySnapshotStore(),
    permissions: new PermissionPolicyService(),
    approvals: localApprovalRequestService
  });
  return createCommandBus(orchestrator);
}

export async function runAllowedCommand(bus: CommandBus, userId = "local-user") {
  if (devCommandsBlocked()) return devCommandsBlockedResponse();
  const command = createCommand({
    type: "jobs.run_pipeline",
    requestedBy: "api",
    userId,
    entityType: "job",
    entityId: `dev-job-${Date.now()}`,
    payload: {
      title: "Dev Demo Platform Engineer",
      company: "Career OS Demo Company",
      location: "Remote",
      description: "Safe local demo role for Splunk Cribl Terraform AWS observability work.",
      source: "approval-demo"
    }
  });

  return commandResult(await bus.execute(command));
}

export async function runRequiresApprovalCommand(bus: CommandBus, userId = "local-user") {
  if (devCommandsBlocked()) return devCommandsBlockedResponse();
  const command = createCommand({
    type: "email.send",
    requestedBy: "api",
    userId,
    entityType: "email",
    entityId: `dev-email-${Date.now()}`,
    payload: {
      to: "demo@example.invalid",
      subject: "Approval demo only",
      body: "This payload is never sent. It exists only to exercise the approval gate."
    }
  });

  return commandResult(await bus.execute(command));
}

export async function runDeniedCommand(bus: CommandBus, userId = "local-user") {
  if (devCommandsBlocked()) return devCommandsBlockedResponse();
  const command = createCommand({
    type: "application.auto_submit",
    requestedBy: "api",
    userId,
    entityType: "application",
    entityId: `dev-application-${Date.now()}`,
    payload: {
      target: "approval-demo",
      note: "This payload is never submitted. It exists only to exercise denied policy."
    }
  });

  return commandResult(await bus.execute(command));
}

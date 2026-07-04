import { domainRegistry, runtimeDescriptors } from "@career-os/domains";
import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import type { DomainDefinition, DomainRuntimeDescriptor } from "@career-os/shared";
import { describe, expect, it } from "vitest";
import { InMemoryApprovalRequestService } from "../approvals";
import { createCommand } from "../command-bus";
import { createCommandBus, createOrchestrator } from "../orchestrator";
import { PermissionPolicyService } from "../permissions";
import { buildRuntimeAuditReport, RUNTIME_LATEST_AUDIT_PROJECTION, type RuntimeAuditReport } from "../runtime-audit";

function createTestPlatform() {
  const eventStore = new InMemoryEventStore();
  const stateStore = new InMemoryStateStore();
  const snapshotStore = new InMemorySnapshotStore();
  const approvals = new InMemoryApprovalRequestService(eventStore);
  const orchestrator = createOrchestrator({ eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService(), approvals });
  const bus = createCommandBus(orchestrator);
  return { eventStore, stateStore, snapshotStore, approvals, orchestrator, bus };
}

function resultData(result: { data?: unknown }) {
  return result.data as RuntimeAuditReport;
}

const syntheticDomain: DomainDefinition = {
  name: "Synthetic Domain",
  slug: "synthetic-domain",
  manager: "Synthetic Manager",
  capabilities: ["SyntheticCapability"],
  workers: ["SyntheticWorker"],
  tools: ["SyntheticTool"],
  commands: ["synthetic.run"],
  events: ["synthetic.completed"],
  permissions: [],
  dependencies: [],
  status: "partial",
  version: "0.1.0"
};

function syntheticDescriptor(overrides: Partial<DomainRuntimeDescriptor> = {}): DomainRuntimeDescriptor {
  return {
    domainId: "synthetic-domain",
    displayName: "Synthetic Domain",
    managerId: "Synthetic Manager",
    commands: ["synthetic.run"],
    capabilities: ["SyntheticCapability"],
    workers: ["SyntheticWorker"],
    tools: ["SyntheticTool"],
    eventsProduced: ["synthetic.completed", "synthetic.failed"],
    stateProjections: ["synthetic.current"],
    approvalRequired: false,
    gated: false,
    disabled: false,
    uiVisible: true,
    tests: { unit: false, integration: false, e2e: false },
    ...overrides
  };
}

describe("Runtime Audit v2", () => {
  it("routes system.runtime_audit through the Command Bus", async () => {
    const { bus, orchestrator } = createTestPlatform();
    const result = await bus.execute(createCommand({ type: "system.runtime_audit", requestedBy: "system", entityType: "runtime", entityId: "latest", payload: {} }));

    expect(orchestrator.listCommandTypes().includes("system.runtime_audit")).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(resultData(result).totalDomains).toBe(domainRegistry.length);
  });

  it("reports registered commands that are missing runtime handlers", () => {
    const { orchestrator } = createTestPlatform();
    const report = buildRuntimeAuditReport({ domains: domainRegistry, descriptors: runtimeDescriptors, runtimeWiredCommands: orchestrator.listCommandTypes(), runtimeWiredManagers: orchestrator.listRuntimeManagers() });

    expect(report.commandsMissingHandlers.length > 0).toBe(true);
    expect(report.commandsMissingHandlers.includes("ai.chat.complete")).toBe(true);
  });

  it("does not mark placeholder domains active", () => {
    const { orchestrator } = createTestPlatform();
    const report = buildRuntimeAuditReport({ domains: domainRegistry, descriptors: runtimeDescriptors, runtimeWiredCommands: orchestrator.listCommandTypes(), runtimeWiredManagers: orchestrator.listRuntimeManagers() });
    const memory = report.manifests.find((manifest) => manifest.domainId === "memory");

    expect(memory?.status).toBe("placeholder");
    expect(memory?.active).toBe(false);
    expect(memory?.readinessLabel).toBe("Planned");
  });

  it("reports registered but unwired tools as inactive", () => {
    const { orchestrator } = createTestPlatform();
    const report = buildRuntimeAuditReport({ domains: domainRegistry, descriptors: runtimeDescriptors, runtimeWiredCommands: orchestrator.listCommandTypes(), runtimeWiredManagers: orchestrator.listRuntimeManagers() });

    expect(report.toolsRegisteredButInactive.includes("OpenRouterChatCompletionsTool")).toBe(true);
    expect(report.toolsActive.includes("OpenRouterChatCompletionsTool")).toBe(false);
  });

  it("writes the latest runtime audit state projection", async () => {
    const { bus, stateStore } = createTestPlatform();
    const result = await bus.execute(createCommand({ type: "system.runtime_audit", requestedBy: "system", entityType: "runtime", entityId: "latest", payload: {} }));
    const projection = stateStore.getProjection("runtime", "latest", RUNTIME_LATEST_AUDIT_PROJECTION);

    expect(result.ok).toBe(true);
    expect(Boolean(projection)).toBe(true);
    expect((projection?.data as RuntimeAuditReport).auditId).toBe("latest");
  });

  it("emits command and runtime audit lifecycle events", async () => {
    const { bus, eventStore } = createTestPlatform();
    const result = await bus.execute(createCommand({ type: "system.runtime_audit", requestedBy: "system", entityType: "runtime", entityId: "latest", payload: {} }));
    const emittedTypes = eventStore.listByEntity("runtime", "latest").map((event) => event.eventType);

    expect(result.ok).toBe(true);
    expect(emittedTypes.includes("command.received")).toBe(true);
    expect(emittedTypes.includes("command.accepted")).toBe(true);
    expect(emittedTypes.includes("runtime.audit_started")).toBe(true);
    expect(emittedTypes.includes("runtime.audit_completed")).toBe(true);
    expect(emittedTypes.includes("command.completed")).toBe(true);
  });

  it("keeps disabled and gated external-action tools disabled", async () => {
    const { bus, eventStore, orchestrator } = createTestPlatform();
    const emailResult = await bus.execute(createCommand({ type: "email.send", requestedBy: "api", entityType: "email", entityId: "email-audit-1", payload: { to: "demo@example.invalid", subject: "Demo" } }));
    const report = buildRuntimeAuditReport({ domains: domainRegistry, descriptors: runtimeDescriptors, runtimeWiredCommands: orchestrator.listCommandTypes(), runtimeWiredManagers: orchestrator.listRuntimeManagers() });
    const communications = report.manifests.find((manifest) => manifest.domainId === "communications");
    const browserCopilot = report.manifests.find((manifest) => manifest.domainId === "browser-copilot");
    const emittedTypes = eventStore.listByEntity("email", "email-audit-1").map((event) => event.eventType);

    expect(emailResult.status).toBe("requires_approval");
    expect(report.disabledOrGatedDomains.includes("communications")).toBe(true);
    expect(communications?.active).toBe(false);
    expect(communications?.readinessLabel).toBe("Gated");
    expect(browserCopilot?.runtimeWired).toBe(false);
    expect(browserCopilot?.active).toBe(false);
    expect(emittedTypes.includes("email.sent")).toBe(false);
  });

  it("includes Profile Facts dependency and new events in the Resume Factory descriptor", () => {
    const descriptor = runtimeDescriptors.find((item) => item.domainId === "resume-factory");

    expect(descriptor?.stateProjectionDependencies?.includes("profile_facts.current")).toBe(true);
    expect(descriptor?.dependencies?.includes("profile_facts.current")).toBe(true);
    expect(Boolean(descriptor?.eventsProduced.includes("resume.profile_facts_loaded"))).toBe(true);
    expect(Boolean(descriptor?.eventsProduced.includes("resume.claims_filtered"))).toBe(true);
    expect(Boolean(descriptor?.eventsProduced.includes("resume.truthfulness_summary_created"))).toBe(true);
    expect(Boolean(descriptor?.eventsProduced.includes("resume.claim_blocked"))).toBe(true);
    expect(Boolean(descriptor?.eventsProduced.includes("resume.generation_failed"))).toBe(true);
  });

  it("computes descriptor-based maturity from wired commands, written projections, and found tests", () => {
    const report = buildRuntimeAuditReport({
      domains: [syntheticDomain],
      descriptors: [syntheticDescriptor({ tests: { unit: true, integration: false, e2e: false } })],
      runtimeWiredCommands: ["synthetic.run"],
      observedStateProjections: ["synthetic.current"],
      testFilePaths: ["/repo/packages/domains/src/synthetic-domain/__tests__/synthetic.test.ts"]
    });
    const manifest = report.manifests[0];

    expect(manifest.descriptorPresent).toBe(true);
    expect(manifest.status).toBe("production_ready");
    expect(manifest.active).toBe(true);
  });

  it("reports needs_wiring when a descriptor declares a command with no handler", () => {
    const report = buildRuntimeAuditReport({
      domains: [syntheticDomain],
      descriptors: [syntheticDescriptor({ commands: ["synthetic.missing"] })],
      runtimeWiredCommands: [],
      testFilePaths: []
    });

    expect(report.manifests[0].status).toBe("needs_wiring");
    expect(report.manifests[0].commandsMissingHandlers.includes("synthetic.missing")).toBe(true);
  });

  it("does not mark a domain with events but no projection as stateful", () => {
    const report = buildRuntimeAuditReport({
      domains: [syntheticDomain],
      descriptors: [syntheticDescriptor({ stateProjections: [] })],
      runtimeWiredCommands: ["synthetic.run"],
      testFilePaths: []
    });

    expect(report.manifests[0].status).toBe("tool_enabled");
    expect(report.domainsMissingStateProjections.includes("synthetic-domain")).toBe(true);
    expect(report.eventsWithoutStateProjection.includes("synthetic-domain")).toBe(true);
  });

  it("flags a stateful descriptor when no declared projection has been written", () => {
    const report = buildRuntimeAuditReport({
      domains: [syntheticDomain],
      descriptors: [syntheticDescriptor()],
      runtimeWiredCommands: ["synthetic.run"],
      observedStateProjections: [],
      testFilePaths: []
    });

    expect(report.manifests[0].status).toBe("tool_enabled");
    expect(report.domainsClaimingStatefulWithoutProjection.includes("synthetic-domain")).toBe(true);
    expect(report.manifests[0].blockedFromActiveReasons.includes("state_projection_not_written")).toBe(true);
  });

  it("keeps Resume Factory maturity honest when profile-fact-backed runtime evidence is absent", () => {
    const { orchestrator } = createTestPlatform();
    const report = buildRuntimeAuditReport({
      domains: domainRegistry,
      descriptors: runtimeDescriptors,
      runtimeWiredCommands: orchestrator.listCommandTypes(),
      runtimeWiredManagers: orchestrator.listRuntimeManagers(),
      observedStateProjections: [],
      testFilePaths: ["/repo/packages/domains/src/resume-factory/__tests__/resume-factory-manager.test.ts"]
    });
    const manifest = report.manifests.find((item) => item.domainId === "resume-factory");

    expect(manifest?.status === "production_ready").toBe(false);
    expect(Boolean(manifest?.blockedFromActiveReasons.includes("state_projection_not_written"))).toBe(true);
  });

  it("flags declared test coverage that has no matching test file", () => {
    const report = buildRuntimeAuditReport({
      domains: [syntheticDomain],
      descriptors: [syntheticDescriptor({ tests: { unit: true, integration: false, e2e: false } })],
      runtimeWiredCommands: ["synthetic.run"],
      observedStateProjections: ["synthetic.current"],
      testFilePaths: []
    });

    expect(report.manifests[0].testsDeclared.unit).toBe(true);
    expect(report.manifests[0].testsFound.unit).toBe(false);
    expect(report.missingDeclaredTests.includes("synthetic-domain:unit")).toBe(true);
  });
});

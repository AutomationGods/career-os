import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { EventStore } from "@career-os/events";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract, DomainRuntimeDescriptor, DomainRuntimeTestsDescriptor, PermissionName } from "@career-os/shared";
import type { StateProjectionRecord, StateStore } from "@career-os/state";
import { approvalRequiredPermissions, protectedCommandPermissions } from "./permissions";

export const SYSTEM_RUNTIME_AUDIT_COMMAND = "system.runtime_audit";
export const RUNTIME_AUDIT_STARTED_EVENT = "runtime.audit_started";
export const RUNTIME_AUDIT_COMPLETED_EVENT = "runtime.audit_completed";
export const RUNTIME_AUDIT_FAILED_EVENT = "runtime.audit_failed";
export const RUNTIME_LATEST_AUDIT_PROJECTION = "runtime.latest_audit";

export type DomainRuntimeManifestStatus = "placeholder" | "registered" | "needs_wiring" | "runtime_wired" | "tool_enabled" | "stateful" | "gated" | "disabled" | "production_ready";
export type DomainRuntimeReadinessLabel = "Active" | "Planned" | "Registered" | "Needs Wiring" | "Disabled" | "Gated";
export type DomainRuntimeTestKind = keyof DomainRuntimeTestsDescriptor;

export interface RuntimeManagerSummary {
  domainSlug: string;
  domainName: string;
  managerName: string;
  commandTypes: string[];
}

export interface DomainRuntimeManifest {
  domainId: string;
  displayName: string;
  status: DomainRuntimeManifestStatus;
  readinessLabel: DomainRuntimeReadinessLabel;
  owningManager: string;
  descriptorPresent: boolean;
  commands: string[];
  commandsDeclared: string[];
  capabilities: string[];
  workers: string[];
  tools: string[];
  eventsProduced: string[];
  stateProjections: string[];
  stateProjectionsWritten: string[];
  approvalRequired: boolean;
  gated: boolean;
  disabled: boolean;
  runtimeWired: boolean;
  uiVisible: boolean;
  testsDeclared: DomainRuntimeTestsDescriptor;
  testsFound: DomainRuntimeTestsDescriptor;
  missingDeclaredTests: DomainRuntimeTestKind[];
  active: boolean;
  failurePathExists: boolean;
  commandsRuntimeWired: string[];
  commandsMissingHandlers: string[];
  toolsActive: string[];
  toolsRegisteredButInactive: string[];
  blockedFromActiveReasons: string[];
}

export interface RuntimeAuditReport {
  auditId: string;
  generatedAt: string;
  totalDomains: number;
  placeholderDomains: number;
  registeredDomains: number;
  needsWiringDomains: number;
  runtimeWiredDomains: number;
  toolEnabledDomains: number;
  statefulDomains: number;
  gatedDomains: number;
  disabledDomains: number;
  productionReadyDomains: number;
  totalCommands: number;
  runtimeWiredCommands: number;
  commandsMissingHandlers: string[];
  managersRegistered: number;
  managersRuntimeWired: number;
  managerNamesRegistered: string[];
  managerNamesRuntimeWired: string[];
  toolsRegistered: number;
  toolsActive: string[];
  toolsRegisteredButInactive: string[];
  domainsMissingManagers: string[];
  managersMissingCapabilities: string[];
  capabilitiesMissingWorkers: string[];
  workersMissingTools: string[];
  domainsMissingStateProjections: string[];
  eventsWithoutStateProjection: string[];
  stateProjectionsWithoutEvents: string[];
  domainsClaimingStatefulWithoutProjection: string[];
  missingDeclaredTests: string[];
  disabledOrGatedDomains: string[];
  manifests: DomainRuntimeManifest[];
}

export interface RuntimeAuditInput {
  domains: DomainDefinition[];
  runtimeWiredCommands: string[];
  runtimeWiredManagers?: RuntimeManagerSummary[];
  descriptors?: DomainRuntimeDescriptor[];
  observedStateProjections?: string[];
  testFilePaths?: string[];
  auditId?: string;
  generatedAt?: Date;
}

const noTests: DomainRuntimeTestsDescriptor = { unit: false, integration: false, e2e: false };

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function isPlaceholderValue(value: string) {
  return value === "Placeholder Capability" || value === "Placeholder Worker" || value === "Placeholder Tool";
}

function hasOnlyPlaceholderValues(values: string[]) {
  return values.length === 0 || values.every(isPlaceholderValue);
}

function domainApprovalRequired(domain: DomainDefinition) {
  const permissionRequiresApproval = domain.permissions.some((permission) => approvalRequiredPermissions.has(permission as PermissionName));
  const commandRequiresApproval = domain.commands.some((command) => approvalRequiredPermissions.has(protectedCommandPermissions[command] as PermissionName));
  return permissionRequiresApproval || commandRequiresApproval;
}

function failurePathExists(eventsProduced: string[], _runtimeWired: boolean) {
  return eventsProduced.some((event) => event.endsWith("_failed") || event.endsWith(".failed"));
}

function collectTestFilePaths(root = process.cwd()) {
  const searchRoots = [join(root, "packages"), join(root, "apps")].filter(existsSync);
  const files: string[] = [];

  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
        walk(path);
      } else if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(path.replaceAll("\\", "/"));
      }
    }
  }

  for (const rootPath of searchRoots) walk(rootPath);
  return files;
}

function testFileMatches(domainId: string, kind: DomainRuntimeTestKind, filePath: string) {
  const normalized = filePath.replaceAll("\\", "/");
  if (kind === "e2e") return normalized.includes(domainId) && (normalized.includes("/e2e/") || normalized.includes(".e2e."));
  if (domainId === "system-kernel") return normalized.includes("runtime-audit.test.") || normalized.includes("/system-kernel/__tests__/");
  if (domainId === "profile-facts") return normalized.includes("profile-facts.test.") || normalized.includes("/profile-facts/__tests__/");
  return normalized.includes(`/packages/domains/src/${domainId}/__tests__/`) && !normalized.endsWith("placeholder.test.ts");
}

function testsFoundFor(domainId: string, declared: DomainRuntimeTestsDescriptor, testFilePaths: string[]): DomainRuntimeTestsDescriptor {
  return {
    unit: declared.unit && testFilePaths.some((filePath) => testFileMatches(domainId, "unit", filePath)),
    integration: declared.integration && testFilePaths.some((filePath) => testFileMatches(domainId, "integration", filePath)),
    e2e: declared.e2e && testFilePaths.some((filePath) => testFileMatches(domainId, "e2e", filePath))
  };
}

function missingDeclaredTests(declared: DomainRuntimeTestsDescriptor, found: DomainRuntimeTestsDescriptor): DomainRuntimeTestKind[] {
  return (["unit", "integration", "e2e"] as DomainRuntimeTestKind[]).filter((kind) => declared[kind] && !found[kind]);
}

function allDeclaredTestsFound(declared: DomainRuntimeTestsDescriptor, found: DomainRuntimeTestsDescriptor) {
  const declaredKinds = (["unit", "integration", "e2e"] as DomainRuntimeTestKind[]).filter((kind) => declared[kind]);
  return declaredKinds.length > 0 && declaredKinds.every((kind) => found[kind]);
}

function blockedReasons(input: {
  runtimeWired: boolean;
  owningManager: string;
  commandsDeclared: string[];
  eventsProduced: string[];
  stateProjections: string[];
  stateProjectionsWritten: string[];
  failurePathExists: boolean;
  gated: boolean;
  disabled: boolean;
  commandsMissingHandlers: string[];
}) {
  const reasons: string[] = [];
  if (!input.runtimeWired) reasons.push("no_runtime_handler");
  if (!input.owningManager) reasons.push("missing_manager");
  if (input.commandsDeclared.length === 0) reasons.push("no_declared_commands");
  if (input.commandsMissingHandlers.length > 0) reasons.push("commands_missing_handlers");
  if (input.eventsProduced.length === 0) reasons.push("no_declared_events");
  if (input.stateProjections.length === 0) reasons.push("no_declared_state_projection");
  if (input.stateProjections.length > 0 && input.stateProjectionsWritten.length === 0) reasons.push("state_projection_not_written");
  if (!input.failurePathExists) reasons.push("missing_failure_path");
  if (input.gated) reasons.push("gated_or_approval_required");
  if (input.disabled) reasons.push("disabled");
  return reasons;
}

function manifestStatusFor(input: {
  descriptorPresent: boolean;
  domainStatus: DomainDefinition["status"];
  disabled: boolean;
  gated: boolean;
  commandsDeclared: string[];
  commandsMissingHandlers: string[];
  runtimeWired: boolean;
  toolsActive: string[];
  stateProjectionsWritten: string[];
  testsReady: boolean;
  failurePathExists: boolean;
}) {
  if (input.disabled || input.domainStatus === "disabled" || input.domainStatus === "deprecated") return "disabled";
  if (input.gated) return "gated";
  if (!input.descriptorPresent && !input.runtimeWired && input.domainStatus === "placeholder") return "placeholder";
  if (input.descriptorPresent && input.commandsDeclared.length > 0 && input.commandsMissingHandlers.length > 0) return "needs_wiring";
  if (!input.runtimeWired) return "registered";
  if (input.runtimeWired && input.toolsActive.length > 0 && input.stateProjectionsWritten.length > 0 && input.testsReady && input.failurePathExists) return "production_ready";
  if (input.stateProjectionsWritten.length > 0) return "stateful";
  if (input.toolsActive.length > 0) return "tool_enabled";
  return "runtime_wired";
}

function readinessLabelFor(status: DomainRuntimeManifestStatus): DomainRuntimeReadinessLabel {
  if (status === "disabled") return "Disabled";
  if (status === "gated") return "Gated";
  if (status === "placeholder") return "Planned";
  if (status === "needs_wiring") return "Needs Wiring";
  if (status === "registered") return "Registered";
  return "Active";
}

export function buildRuntimeAuditReport(input: RuntimeAuditInput): RuntimeAuditReport {
  const runtimeCommandSet = new Set(input.runtimeWiredCommands);
  const runtimeManagerNames = unique((input.runtimeWiredManagers ?? []).map((manager) => manager.managerName));
  const descriptorByDomain = new Map((input.descriptors ?? []).map((descriptor) => [descriptor.domainId, descriptor]));
  const observedStateProjectionSet = new Set(input.observedStateProjections ?? []);
  const testFilePaths = input.testFilePaths ?? collectTestFilePaths();
  const allRegisteredCommands = unique(input.domains.flatMap((domain) => domain.commands));
  const allDescriptorCommands = unique((input.descriptors ?? []).flatMap((descriptor) => descriptor.commands));
  const allKnownCommands = unique([...allRegisteredCommands, ...allDescriptorCommands]);

  const manifests = input.domains.map((domain): DomainRuntimeManifest => {
    const descriptor = descriptorByDomain.get(domain.slug);
    const descriptorPresent = Boolean(descriptor);
    const commandsDeclared = descriptor?.commands ?? [...domain.commands];
    const runtimeWiredCommands = unique(commandsDeclared.filter((command) => runtimeCommandSet.has(command)));
    const missingDescriptorCommands = unique(commandsDeclared.filter((command) => !runtimeCommandSet.has(command)));
    const missingRegistryCommands = unique(domain.commands.filter((command) => !runtimeCommandSet.has(command)));
    const runtimeWired = runtimeWiredCommands.length > 0 || domain.commands.some((command) => runtimeCommandSet.has(command));
    const tools = descriptor?.tools ?? [...domain.tools];
    const eventsProduced = descriptor?.eventsProduced ?? [...domain.events];
    const stateProjections = descriptor?.stateProjections ?? [];
    const stateProjectionsWritten = unique(stateProjections.filter((projection) => observedStateProjectionSet.has(projection)));
    const toolsActive = runtimeWired ? tools.filter((tool) => !isPlaceholderValue(tool)) : [];
    const toolsRegisteredButInactive = tools.filter((tool) => !isPlaceholderValue(tool) && !toolsActive.includes(tool));
    const approvalRequired = descriptor?.approvalRequired ?? domainApprovalRequired(domain);
    const gated = descriptor?.gated ?? approvalRequired;
    const disabled = descriptor?.disabled ?? (domain.status === "disabled" || domain.status === "deprecated");
    const testsDeclared = descriptor?.tests ?? noTests;
    const testsFound = testsFoundFor(domain.slug, testsDeclared, testFilePaths);
    const missingTests = missingDeclaredTests(testsDeclared, testsFound);
    const hasFailurePath = failurePathExists(eventsProduced, runtimeWired);
    const status = manifestStatusFor({
      descriptorPresent,
      domainStatus: domain.status,
      disabled,
      gated,
      commandsDeclared,
      commandsMissingHandlers: missingDescriptorCommands,
      runtimeWired,
      toolsActive,
      stateProjectionsWritten,
      testsReady: allDeclaredTestsFound(testsDeclared, testsFound),
      failurePathExists: hasFailurePath
    });
    const blockedFromActiveReasons = blockedReasons({
      runtimeWired,
      owningManager: descriptor?.managerId ?? domain.manager,
      commandsDeclared,
      eventsProduced,
      stateProjections,
      stateProjectionsWritten,
      failurePathExists: hasFailurePath,
      gated,
      disabled,
      commandsMissingHandlers: missingDescriptorCommands
    });
    const active = blockedFromActiveReasons.length === 0;

    return {
      domainId: domain.slug,
      displayName: descriptor?.displayName ?? domain.name,
      status,
      readinessLabel: readinessLabelFor(status),
      owningManager: descriptor?.managerId ?? domain.manager,
      descriptorPresent,
      commands: [...domain.commands],
      commandsDeclared,
      capabilities: descriptor?.capabilities ?? [...domain.capabilities],
      workers: descriptor?.workers ?? [...domain.workers],
      tools,
      eventsProduced,
      stateProjections,
      stateProjectionsWritten,
      approvalRequired,
      gated,
      disabled,
      runtimeWired,
      uiVisible: descriptor?.uiVisible ?? false,
      testsDeclared,
      testsFound,
      missingDeclaredTests: missingTests,
      active,
      failurePathExists: hasFailurePath,
      commandsRuntimeWired: runtimeWiredCommands,
      commandsMissingHandlers: unique([...missingDescriptorCommands, ...missingRegistryCommands]),
      toolsActive,
      toolsRegisteredButInactive,
      blockedFromActiveReasons
    };
  });

  const commandsMissingHandlers = unique(allKnownCommands.filter((command) => !runtimeCommandSet.has(command)));
  const toolsActive = unique(manifests.flatMap((manifest) => manifest.toolsActive));
  const toolsRegisteredButInactive = unique(manifests.flatMap((manifest) => manifest.toolsRegisteredButInactive));
  const missingDeclaredTestsList = manifests.flatMap((manifest) => manifest.missingDeclaredTests.map((kind) => `${manifest.domainId}:${kind}`));

  return {
    auditId: input.auditId ?? `runtime_audit_${Date.now()}`,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    totalDomains: manifests.length,
    placeholderDomains: manifests.filter((manifest) => manifest.status === "placeholder").length,
    registeredDomains: manifests.filter((manifest) => manifest.status === "registered").length,
    needsWiringDomains: manifests.filter((manifest) => manifest.status === "needs_wiring").length,
    runtimeWiredDomains: manifests.filter((manifest) => manifest.runtimeWired).length,
    toolEnabledDomains: manifests.filter((manifest) => manifest.status === "tool_enabled" || manifest.status === "stateful" || manifest.status === "production_ready").length,
    statefulDomains: manifests.filter((manifest) => manifest.status === "stateful" || manifest.status === "production_ready").length,
    gatedDomains: manifests.filter((manifest) => manifest.status === "gated").length,
    disabledDomains: manifests.filter((manifest) => manifest.status === "disabled").length,
    productionReadyDomains: manifests.filter((manifest) => manifest.status === "production_ready").length,
    totalCommands: allKnownCommands.length,
    runtimeWiredCommands: allKnownCommands.filter((command) => runtimeCommandSet.has(command)).length,
    commandsMissingHandlers,
    managersRegistered: unique(input.domains.map((domain) => domain.manager).filter(Boolean)).length,
    managersRuntimeWired: runtimeManagerNames.length,
    managerNamesRegistered: unique(input.domains.map((domain) => domain.manager).filter(Boolean)),
    managerNamesRuntimeWired: runtimeManagerNames,
    toolsRegistered: unique(manifests.flatMap((manifest) => manifest.tools)).length,
    toolsActive,
    toolsRegisteredButInactive,
    domainsMissingManagers: manifests.filter((manifest) => !manifest.owningManager).map((manifest) => manifest.domainId),
    managersMissingCapabilities: manifests.filter((manifest) => hasOnlyPlaceholderValues(manifest.capabilities)).map((manifest) => manifest.domainId),
    capabilitiesMissingWorkers: manifests.filter((manifest) => hasOnlyPlaceholderValues(manifest.workers)).map((manifest) => manifest.domainId),
    workersMissingTools: manifests.filter((manifest) => hasOnlyPlaceholderValues(manifest.tools)).map((manifest) => manifest.domainId),
    domainsMissingStateProjections: manifests.filter((manifest) => manifest.descriptorPresent && manifest.runtimeWired && manifest.eventsProduced.length > 0 && manifest.stateProjections.length === 0).map((manifest) => manifest.domainId),
    eventsWithoutStateProjection: manifests.filter((manifest) => manifest.eventsProduced.length > 0 && manifest.stateProjections.length === 0).map((manifest) => manifest.domainId),
    stateProjectionsWithoutEvents: manifests.filter((manifest) => manifest.stateProjections.length > 0 && manifest.eventsProduced.length === 0).map((manifest) => manifest.domainId),
    domainsClaimingStatefulWithoutProjection: manifests.filter((manifest) => manifest.stateProjections.length > 0 && manifest.stateProjectionsWritten.length === 0).map((manifest) => manifest.domainId),
    missingDeclaredTests: missingDeclaredTestsList,
    disabledOrGatedDomains: manifests.filter((manifest) => manifest.status === "disabled" || manifest.status === "gated").map((manifest) => manifest.domainId),
    manifests
  };
}

export interface RuntimeAuditManagerOptions {
  domains: DomainDefinition[];
  descriptors?: DomainRuntimeDescriptor[];
  getRuntimeWiredCommands: () => string[];
  getRuntimeWiredManagers: () => RuntimeManagerSummary[];
}

type RuntimeAuditContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
};

async function observedStateProjectionTypes(stateStore: StateStore, userId?: string) {
  const projections = await Promise.resolve(stateStore.listRecent(1000, userId ? { userId } : undefined));
  return unique((projections as StateProjectionRecord[]).map((projection) => projection.projectionType));
}

export class RuntimeAuditManager implements DomainManagerContract {
  readonly domainName = "System Kernel Domain";
  readonly domainSlug = "system-kernel";
  readonly capabilities = [
    {
      name: "RuntimeAuditCapability",
      description: "Audits registered domains against runtime-wired command handlers without enabling external actions.",
      workers: ["RuntimeAuditWorker"],
      commands: [SYSTEM_RUNTIME_AUDIT_COMMAND],
      events: [RUNTIME_AUDIT_STARTED_EVENT, RUNTIME_AUDIT_COMPLETED_EVENT, RUNTIME_AUDIT_FAILED_EVENT],
      permissions: []
    }
  ];

  constructor(private readonly options: RuntimeAuditManagerOptions) {}

  canHandle(command: CareerCommand) {
    return command.type === SYSTEM_RUNTIME_AUDIT_COMMAND;
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult<RuntimeAuditReport>> {
    const executionContext = context as RuntimeAuditContext;
    const auditId = command.entityId ?? `runtime_audit_${Date.now()}`;

    try {
      await executionContext.eventStore.append({
        eventType: RUNTIME_AUDIT_STARTED_EVENT,
        entityType: "runtime",
        entityId: auditId,
        domain: this.domainSlug,
        manager: "System Kernel Manager",
        capability: "RuntimeAuditCapability",
        worker: "RuntimeAuditWorker",
        userId: command.userId,
        payload: { commandId: command.id },
        confidence: 1
      });

      const report = buildRuntimeAuditReport({
        domains: this.options.domains,
        descriptors: this.options.descriptors,
        runtimeWiredCommands: this.options.getRuntimeWiredCommands(),
        runtimeWiredManagers: this.options.getRuntimeWiredManagers(),
        observedStateProjections: await observedStateProjectionTypes(executionContext.stateStore, command.userId),
        auditId
      });

      const completedEvent = await executionContext.eventStore.append({
        eventType: RUNTIME_AUDIT_COMPLETED_EVENT,
        entityType: "runtime",
        entityId: auditId,
        domain: this.domainSlug,
        manager: "System Kernel Manager",
        capability: "RuntimeAuditCapability",
        worker: "RuntimeAuditWorker",
        userId: command.userId,
        payload: report,
        evidence: { externalActionsEnabled: false, descriptorBased: true },
        confidence: 1
      });

      await executionContext.stateStore.upsertProjection({
        userId: command.userId,
        projectionType: RUNTIME_LATEST_AUDIT_PROJECTION,
        entityType: "runtime",
        entityId: "latest",
        sourceEventId: completedEvent.id,
        data: report,
        updatedAt: new Date(report.generatedAt)
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: report,
        emittedEvents: [RUNTIME_AUDIT_STARTED_EVENT, RUNTIME_AUDIT_COMPLETED_EVENT],
        updatedProjections: [RUNTIME_LATEST_AUDIT_PROJECTION]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime audit failure";
      await executionContext.eventStore.append({
        eventType: RUNTIME_AUDIT_FAILED_EVENT,
        entityType: "runtime",
        entityId: auditId,
        domain: this.domainSlug,
        manager: "System Kernel Manager",
        capability: "RuntimeAuditCapability",
        worker: "RuntimeAuditWorker",
        userId: command.userId,
        payload: { commandId: command.id, message },
        confidence: 1
      });

      return {
        ok: false,
        status: "failed",
        commandId: command.id,
        error: { code: "RUNTIME_AUDIT_FAILED", message }
      };
    }
  }
}

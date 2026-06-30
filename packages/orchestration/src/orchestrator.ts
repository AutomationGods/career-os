import {
  buildApplicationPacket,
  buildPacketPlaceholders,
  cacheApplicationPacket,
  dedupeRelationshipsWithResults,
  getApplicationPacket,
  getDomain,
  domainRegistry,
  JobIntelligenceManager,
  CommunicationsManager,
  ResumeFactoryManager,
  normalizeJob,
  scoreFit,
  segmentJob,
  type ApplicationPacketRecord,
  type RelationshipPerson,
  type UpsertPersonInput
} from "@career-os/domains";
import { eventStore, prismaEventStore, type CareerEventInput, type EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import { prismaSnapshotStore, snapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainExecutionContext, DomainManagerContract, PermissionDecision, PermissionService } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { prismaStateStore, stateStore } from "@career-os/state";
import type { ApprovalRequestService } from "./approvals";
import { InMemoryApprovalRequestService, PrismaApprovalRequestService } from "./approvals";
import { CommandBus } from "./command-bus";
import { getPolicyCommandTypes, PermissionPolicyService } from "./permissions";

export interface OrchestratorContext extends DomainExecutionContext {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
  permissions?: PermissionService;
  approvals?: ApprovalRequestService;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isApplicationPacketRecord(value: unknown): value is ApplicationPacketRecord {
  return isRecord(value) && typeof value.id === "string" && typeof value.jobId === "string" && isRecord(value.selectedJob) && isRecord(value.fitScoreSummary);
}

function isRelationshipPerson(value: unknown): value is RelationshipPerson {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" && Array.isArray(value.emails) && Array.isArray(value.phones) && Array.isArray(value.roles);
}

async function loadApplicationPacketFromState(context: OrchestratorContext, packetId: string) {
  const projection = await context.stateStore.getProjection("application_packet", packetId, "application_packet.current");
  return isApplicationPacketRecord(projection?.data) ? projection.data : undefined;
}

async function loadRelationshipPeopleFromState(context: OrchestratorContext) {
  const projections = await context.stateStore.listByProjectionType("relationship.person");
  return projections.map((projection) => projection.data).filter(isRelationshipPerson);
}

function shouldMirrorLocalCache(context: OrchestratorContext) {
  return context.eventStore === eventStore && context.stateStore === stateStore;
}

class ApplicationPacketCommandManager implements DomainManagerContract {
  readonly domainName = "Application Packet Domain";
  readonly domainSlug = "application-packet";
  readonly capabilities = [
    {
      name: "ApplicationPacketAssemblyCapability",
      workers: ["ApplicationPacketWorker"],
      commands: ["application_packets.create", "application_packets.generate_placeholders"],
      events: ["application_packet.created", "application_packet.updated"],
      permissions: []
    }
  ];

  canHandle(command: CareerCommand) {
    return command.type === "application_packets.create" || command.type === "application_packets.generate_placeholders";
  }

  async handle(command: CareerCommand<Record<string, unknown>>, context: DomainExecutionContext): Promise<CommandResult> {
    const executionContext = context as OrchestratorContext;
    if (command.type === "application_packets.generate_placeholders") {
      const packetId = command.entityId ?? String(command.payload.id ?? "");
      if (!packetId) {
        return { ok: false, status: "rejected", commandId: command.id, error: { code: "PACKET_ID_REQUIRED", message: "Application packet id is required" } };
      }

      const mirrorLocalCache = shouldMirrorLocalCache(executionContext);
      const sourcePacket = (await loadApplicationPacketFromState(executionContext, packetId)) ?? (mirrorLocalCache ? getApplicationPacket(packetId) : undefined);
      if (!sourcePacket) {
        return { ok: false, status: "rejected", commandId: command.id, error: { code: "PACKET_NOT_FOUND", message: "Application packet not found" } };
      }

      const packet = buildPacketPlaceholders(packetId, sourcePacket);
      if (mirrorLocalCache) cacheApplicationPacket(packet);
      const emittedEvents = ["resume.placeholder_created", "cover_letter.placeholder_created", "recruiter_message.placeholder_created", "application_packet.updated"];
      let sourceEventId: string | undefined;
      for (const eventType of emittedEvents) {
        const event = await executionContext.eventStore.append({ eventType, entityType: "application_packet", entityId: packet.id, domain: this.domainSlug, manager: "Application Packet Manager", userId: command.userId, payload: packet, confidence: 1 });
        sourceEventId = event.id;
      }
      await executionContext.stateStore.upsertProjection({ userId: command.userId, projectionType: "application_packet.current", entityType: "application_packet", entityId: packet.id, sourceEventId, data: packet, updatedAt: new Date(packet.updatedAt) });
      return { ok: true, status: "completed", commandId: command.id, data: packet, emittedEvents, updatedProjections: ["application_packet.current"] };
    }

    const rawJob = (command.payload.selectedJob ?? command.payload.job ?? { title: "Untitled role", company: "Unknown company", source: "command" }) as Record<string, unknown>;
    const selectedJob = normalizeJob(rawJob);
    const packet = buildApplicationPacket({
      jobId: String(command.payload.jobId ?? command.entityId ?? `job_${Date.now()}`),
      companyId: command.payload.companyId ? String(command.payload.companyId) : undefined,
      personId: command.payload.personId ? String(command.payload.personId) : undefined,
      selectedJob,
      selectedCompany: (command.payload.selectedCompany as { id?: string; name: string } | undefined) ?? { id: command.payload.companyId ? String(command.payload.companyId) : undefined, name: selectedJob.company },
      selectedPerson: command.payload.selectedPerson as { id?: string; name: string; email?: string } | undefined,
      fitScoreSummary: (command.payload.fitScoreSummary as { score: number; segment: ReturnType<typeof segmentJob>; highlights?: string[] } | undefined) ?? { score: scoreFit(selectedJob), segment: segmentJob(selectedJob), highlights: [] },
      notes: command.payload.notes as string[] | undefined
    });
    if (shouldMirrorLocalCache(executionContext)) cacheApplicationPacket(packet);
    const event = await executionContext.eventStore.append({ eventType: "application_packet.created", entityType: "application_packet", entityId: packet.id, domain: this.domainSlug, manager: "Application Packet Manager", userId: command.userId, payload: packet, confidence: 1 });
    await executionContext.stateStore.upsertProjection({ userId: command.userId, projectionType: "application_packet.current", entityType: "application_packet", entityId: packet.id, sourceEventId: event.id, data: packet, updatedAt: new Date(packet.updatedAt) });
    return { ok: true, status: "completed", commandId: command.id, data: packet, emittedEvents: ["application_packet.created"], updatedProjections: ["application_packet.current"] };
  }
}

class RelationshipCommandManager implements DomainManagerContract {
  readonly domainName = "Relationship Intelligence Domain";
  readonly domainSlug = "relationship-intelligence";
  readonly capabilities = [
    {
      name: "RelationshipDedupeCapability",
      workers: ["RelationshipDedupeWorker"],
      commands: ["relationships.dedupe"],
      events: ["relationship.deduplicated", "relationship.updated"],
      permissions: []
    }
  ];

  canHandle(command: CareerCommand) {
    return command.type === "relationships.dedupe";
  }

  async handle(command: CareerCommand<{ people?: unknown[] } | unknown[]>, context: DomainExecutionContext): Promise<CommandResult> {
    const executionContext = context as OrchestratorContext;
    const people = Array.isArray(command.payload) ? command.payload : command.payload.people ?? [];
    const existingPeople = await loadRelationshipPeopleFromState(executionContext);
    const results = dedupeRelationshipsWithResults(people as UpsertPersonInput[], existingPeople, shouldMirrorLocalCache(executionContext));
    const emittedEvents: string[] = [];

    for (const result of results) {
      const event = await executionContext.eventStore.append({
        eventType: result.eventType,
        entityType: "person",
        entityId: result.person.id,
        domain: this.domainSlug,
        manager: "Relationship Intelligence Manager",
        userId: command.userId,
        payload: { input: result.input, person: result.person, duplicateId: result.duplicateId },
        confidence: result.confidence
      });
      emittedEvents.push(result.eventType);
      await executionContext.stateStore.upsertProjection({ userId: command.userId, projectionType: "relationship.person", entityType: "person", entityId: result.person.id, sourceEventId: event.id, data: result.person, updatedAt: new Date() });
    }

    return { ok: true, status: "completed", commandId: command.id, data: { relationships: results.map((result) => result.person) }, emittedEvents: [...new Set(emittedEvents)], updatedProjections: ["relationship.person"] };
  }
}

class DailyMissionCommandManager implements DomainManagerContract {
  readonly domainName = "Mission Domain";
  readonly domainSlug = "mission";
  readonly capabilities = [
    {
      name: "DailyMissionGenerationCapability",
      workers: ["DailyMissionWorker"],
      commands: ["daily_mission.generate"],
      events: ["daily_mission.generated"],
      permissions: []
    }
  ];

  canHandle(command: CareerCommand) {
    return command.type === "daily_mission.generate";
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const executionContext = context as OrchestratorContext;
    const projection = await executionContext.stateStore.upsertProjection({
      userId: command.userId,
      projectionType: "daily_mission.current_queue",
      entityType: "daily_mission",
      entityId: command.entityId ?? "today",
      data: {
        topRemoteCommercialJobs: [],
        hybridCommercialJobs: [],
        onsiteCommercialJobs: [],
        clearanceGovernmentSeparatedJobs: [],
        lowFitJobs: [],
        jobsReadyForPacketGeneration: [],
        packetsAwaitingReview: [],
        followupsDuePlaceholder: [],
        estimatedApplyTimePlaceholder: "TBD after application difficulty scoring"
      },
      updatedAt: new Date()
    });
    return { ok: true, status: "completed", commandId: command.id, data: projection, emittedEvents: ["daily_mission.generated"], updatedProjections: ["daily_mission.current_queue"] };
  }
}

export class Orchestrator {
  private readonly managers = new Map<string, DomainManagerContract>();

  constructor(private readonly context: OrchestratorContext) {}

  registerManager(manager: DomainManagerContract) {
    for (const capability of manager.capabilities) {
      for (const commandType of capability.commands) {
        this.managers.set(commandType, manager);
      }
    }
  }

  listCommandTypes() {
    return [...this.managers.keys()].sort();
  }

  canHandle(commandType: string) {
    return this.managers.has(commandType);
  }

  async execute(command: CareerCommand): Promise<CommandResult> {
    return this.executeWithPolicy(command, false);
  }

  async executeApprovedCommand(command: CareerCommand): Promise<CommandResult> {
    return this.executeWithPolicy(command, true);
  }

  private async executeWithPolicy(command: CareerCommand, approvalReplay: boolean): Promise<CommandResult> {
    await this.emitCommandEvent(command, approvalReplay ? "command.replay_received" : "command.received", "accepted", undefined, undefined, undefined, command.metadata?.approvalRequestId as string | undefined);
    const domain = this.resolveDomain(command);
    const decision = await (this.context.permissions ?? new PermissionPolicyService()).evaluate(command);

    if (decision.status === "denied") {
      const result = this.rejected(command, "COMMAND_DENIED", decision.reason);
      await this.emitCommandEvent(command, "command.rejected", result.status, result.error, domain?.slug, decision);
      return result;
    }

    const isProtectedPolicyCommand = getPolicyCommandTypes().includes(command.type);
    if (!domain && !isProtectedPolicyCommand) {
      const result = this.rejected(command, "COMMAND_DOMAIN_NOT_REGISTERED", `No registered domain command found for ${command.type}`);
      await this.emitCommandEvent(command, "command.rejected", result.status, result.error);
      return result;
    }

    if (decision.status === "requires_approval" && !approvalReplay) {
      const approval = await (this.context.approvals ?? new InMemoryApprovalRequestService(this.context.eventStore)).createForCommand(command, decision);
      const result: CommandResult = {
        ok: false,
        status: "requires_approval",
        commandId: command.id,
        approvalRequestId: approval.id,
        error: { code: "APPROVAL_REQUIRED", message: "This command requires user approval." }
      };
      await this.emitCommandEvent(command, "command.requires_approval", result.status, result.error, domain?.slug, decision, approval.id);
      return result;
    }

    if (decision.status === "requires_approval" && approvalReplay) {
      const result = this.rejected(command, "APPROVED_REPLAY_POLICY_MISMATCH", "Approved replay could not be verified by permission policy.");
      await this.emitCommandEvent(command, "command.replay_failed", result.status, result.error, domain?.slug, decision, command.metadata?.approvalRequestId as string | undefined);
      return result;
    }

    if (!domain) {
      const result = this.rejected(command, "COMMAND_DOMAIN_NOT_REGISTERED", `No registered domain command found for ${command.type}`);
      await this.emitCommandEvent(command, approvalReplay ? "command.replay_failed" : "command.rejected", result.status, result.error);
      return result;
    }

    const manager = this.managers.get(command.type);
    if (!manager || !manager.canHandle(command)) {
      const result = this.rejected(command, "COMMAND_HANDLER_NOT_FOUND", `No manager can handle ${command.type}`);
      await this.emitCommandEvent(command, "command.rejected", result.status, result.error, domain.slug, decision);
      return result;
    }

    await this.emitCommandEvent(command, approvalReplay ? "command.replay_started" : "command.accepted", "accepted", undefined, domain.slug, decision, command.metadata?.approvalRequestId as string | undefined);
    try {
      const result = await manager.handle({ ...command, domain: domain.slug }, this.context);
      await this.emitCommandEvent(command, approvalReplay ? (result.ok ? "command.replay_completed" : "command.replay_failed") : (result.ok ? "command.completed" : "command.failed"), result.status, result.error, domain.slug, decision, command.metadata?.approvalRequestId as string | undefined);
      return result;
    } catch (error) {
      const result: CommandResult = {
        ok: false,
        status: "failed",
        commandId: command.id,
        error: { code: "COMMAND_EXECUTION_FAILED", message: error instanceof Error ? error.message : "Unknown command failure" }
      };
      await this.emitCommandEvent(command, approvalReplay ? "command.replay_failed" : "command.failed", result.status, result.error, domain.slug, decision, command.metadata?.approvalRequestId as string | undefined);
      return result;
    }
  }

  private resolveDomain(command: CareerCommand) {
    if (command.domain) {
      const direct = getDomain(command.domain);
      if (direct?.commands.includes(command.type)) return direct;
    }
    return getDomainByCommand(command.type);
  }

  private rejected(command: CareerCommand, code: string, message: string): CommandResult {
    return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
  }

  private async emitCommandEvent(command: CareerCommand, eventType: string, status: string, error?: unknown, domain = command.domain ?? "orchestration", decision?: PermissionDecision, approvalRequestId?: string) {
    const event: CareerEventInput = {
      eventType,
      entityType: command.entityType ?? "command",
      entityId: command.entityId ?? command.id,
      domain: "orchestration",
      manager: "Orchestrator",
      capability: "CommandRoutingCapability",
      worker: "CommandRouterWorker",
      userId: command.userId,
      payload: {
        commandId: command.id,
        commandType: command.type,
        requestedBy: command.requestedBy,
        domain,
        entityType: command.entityType,
        entityId: command.entityId,
        status,
        approvalRequestId,
        permission: decision?.permission,
        riskLevel: decision?.riskLevel,
        reason: decision?.reason,
        error
      },
      confidence: eventType === "command.failed" ? 1 : undefined
    };
    await this.context.eventStore.append(event);
  }
}

function getDomainByCommand(commandType: string) {
  return domainRegistry.find((domain) => domain.commands.includes(commandType));
}

export function createOrchestrator(context: OrchestratorContext) {
  const orchestrator = new Orchestrator(context);
  orchestrator.registerManager(new JobIntelligenceManager());
  orchestrator.registerManager(new ApplicationPacketCommandManager());
  orchestrator.registerManager(new RelationshipCommandManager());
  orchestrator.registerManager(new DailyMissionCommandManager());
  orchestrator.registerManager(new ResumeFactoryManager());
  orchestrator.registerManager(new CommunicationsManager());
  return orchestrator;
}

export function createCommandBus(orchestrator: Orchestrator) {
  const bus = new CommandBus();
  const commandTypes = new Set([...orchestrator.listCommandTypes(), ...getPolicyCommandTypes()]);
  for (const commandType of commandTypes) {
    bus.registerHandler(commandType, (command) => orchestrator.execute(command));
  }
  return bus;
}

export function createApprovedReplayCommandBus(orchestrator: Orchestrator) {
  const bus = new CommandBus();
  const commandTypes = new Set([...orchestrator.listCommandTypes(), ...getPolicyCommandTypes()]);
  for (const commandType of commandTypes) {
    bus.registerHandler(commandType, (command) => orchestrator.executeApprovedCommand(command));
  }
  return bus;
}

export function createDefaultOrchestrator() {
  return createOrchestrator({
    eventStore: prismaEventStore,
    stateStore: prismaStateStore,
    snapshotStore: prismaSnapshotStore,
    permissions: new PermissionPolicyService(),
    approvals: new PrismaApprovalRequestService(prismaEventStore)
  });
}

export function createInMemoryOrchestrator() {
  return createOrchestrator({
    eventStore,
    stateStore,
    snapshotStore,
    permissions: new PermissionPolicyService(),
    approvals: new InMemoryApprovalRequestService(eventStore)
  });
}

export function createDefaultCommandBus() {
  return createCommandBus(createDefaultOrchestrator());
}

export function createInMemoryCommandBus() {
  return createCommandBus(createInMemoryOrchestrator());
}

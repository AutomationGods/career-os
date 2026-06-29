import type { EventStore } from "@career-os/events";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract, JobSegment, NormalizedJob } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { normalizeJob, scoreFit, segmentJob } from "../job-intelligence";
import type { JobStore, PersistedJobRecord } from "../job-discovery/job-store";
import {
  createApplicationPacket,
  generatePacketPlaceholders,
  normalizedJobFromPersistedJob,
  updateApplicationPacketStatus,
  type ApplicationPacketListFilter,
  type ApplicationPacketRecord,
  type ApplicationPacketStatus,
  type ApplicationPacketStore,
  prismaApplicationPacketStore
} from "./services";

export const APPLICATION_PACKETS_CREATE_COMMAND = "application_packets.create";
export const APPLICATION_PACKETS_GENERATE_PLACEHOLDERS_COMMAND = "application_packets.generate_placeholders";
export const APPLICATION_PACKETS_GET_COMMAND = "application_packets.get";
export const APPLICATION_PACKETS_LIST_COMMAND = "application_packets.list";
export const APPLICATION_PACKETS_UPDATE_STATUS_COMMAND = "application_packets.update_status";

export const APPLICATION_PACKET_CREATED_EVENT = "application_packet.created";
export const APPLICATION_PACKET_UPDATED_EVENT = "application_packet.updated";
export const APPLICATION_PACKET_STATUS_UPDATED_EVENT = "application_packet.status_updated";
export const RESUME_PLACEHOLDER_CREATED_EVENT = "resume.placeholder_created";
export const COVER_LETTER_PLACEHOLDER_CREATED_EVENT = "cover_letter.placeholder_created";
export const RECRUITER_MESSAGE_PLACEHOLDER_CREATED_EVENT = "recruiter_message.placeholder_created";

export const APPLICATION_PACKET_CURRENT_PROJECTION = "application_packet.current";
export const APPLICATION_PACKET_REVIEW_QUEUE_PROJECTION = "application_packet.review_queue";

const COMMANDS = [
  APPLICATION_PACKETS_CREATE_COMMAND,
  APPLICATION_PACKETS_GENERATE_PLACEHOLDERS_COMMAND,
  APPLICATION_PACKETS_GET_COMMAND,
  APPLICATION_PACKETS_LIST_COMMAND,
  APPLICATION_PACKETS_UPDATE_STATUS_COMMAND
];

const STATUSES: ApplicationPacketStatus[] = ["not_started", "ready_to_generate", "generated", "awaiting_review", "ready_to_apply", "submitted", "followup_due", "closed"];

export const definition: DomainDefinition = {
  name: "Application Packet Domain",
  slug: "application-packet",
  manager: "Application Packet Manager",
  capabilities: ["ApplicationPacketAssemblyCapability"],
  workers: ["ApplicationPacketWorker"],
  tools: ["ApplicationPacketStore", "DeterministicDraftBuilder"],
  commands: COMMANDS,
  events: [
    APPLICATION_PACKET_CREATED_EVENT,
    APPLICATION_PACKET_UPDATED_EVENT,
    APPLICATION_PACKET_STATUS_UPDATED_EVENT,
    RESUME_PLACEHOLDER_CREATED_EVENT,
    COVER_LETTER_PLACEHOLDER_CREATED_EVENT,
    RECRUITER_MESSAGE_PLACEHOLDER_CREATED_EVENT
  ],
  permissions: ["export_document"],
  dependencies: ["event-store", "state-store", "job-discovery", "job-intelligence", "resume-factory", "cover-letter", "relationship-intelligence"],
  status: "partial",
  version: "1.0.0"
};

type ApplicationPacketContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
  applicationPacketStore?: ApplicationPacketStore;
  jobStore?: JobStore;
};

type CreatePayload = Record<string, unknown> & {
  jobId?: unknown;
  companyId?: unknown;
  personId?: unknown;
  selectedJob?: unknown;
  job?: unknown;
  selectedCompany?: unknown;
  selectedPerson?: unknown;
  fitScoreSummary?: unknown;
  notes?: unknown;
};

type StatusPayload = Record<string, unknown> & {
  id?: unknown;
  status?: unknown;
  nextAction?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringFrom(value: unknown) {
  const text = stringFrom(value);
  return text.length > 0 ? text : undefined;
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArrayFrom(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function validationError(command: CareerCommand, code: string, message: string): CommandResult {
  return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
}

function packetIdFrom(command: CareerCommand) {
  const payload = isRecord(command.payload) ? command.payload : {};
  return stringFrom(command.entityId ?? payload.id ?? payload.packetId ?? payload.applicationPacketId);
}

function parseStatus(value: unknown): ApplicationPacketStatus | undefined {
  const status = optionalStringFrom(value);
  return STATUSES.includes(status as ApplicationPacketStatus) ? status as ApplicationPacketStatus : undefined;
}

function normalizeParty(value: unknown): { id?: string; name: string; email?: string } | undefined {
  if (!isRecord(value)) return undefined;
  const name = optionalStringFrom(value.name);
  if (!name) return undefined;
  return { id: optionalStringFrom(value.id), name, email: optionalStringFrom(value.email) };
}

function persistedHighlights(job?: PersistedJobRecord) {
  if (!job) return [];
  return [
    ...job.skills.slice(0, 4).map((skill) => skill.skill),
    job.segments[0]?.segment,
    job.fitScores[0] ? `${job.fitScores[0].score}/100 fit score` : undefined
  ].filter((value): value is string => Boolean(value));
}

function fitScoreSummaryFrom(payload: CreatePayload, selectedJob: NormalizedJob, persistedJob?: PersistedJobRecord) {
  const raw = isRecord(payload.fitScoreSummary) ? payload.fitScoreSummary : {};
  const score = numberFrom(raw.score) ?? persistedJob?.fitScores[0]?.score ?? persistedJob?.latestPipelineResult?.fitScore ?? scoreFit(selectedJob);
  const segment = optionalStringFrom(raw.segment) as JobSegment | undefined ?? persistedJob?.segments[0]?.segment ?? persistedJob?.latestPipelineResult?.dashboardSegment ?? segmentJob(selectedJob);
  const highlights = stringArrayFrom(raw.highlights);
  return { score, segment, highlights: highlights.length > 0 ? highlights : persistedHighlights(persistedJob) };
}

function rawJobFromPayload(payload: CreatePayload, persistedJob?: PersistedJobRecord) {
  if (persistedJob) return normalizedJobFromPersistedJob(persistedJob);
  const raw = payload.selectedJob ?? payload.job;
  if (isRecord(raw)) return normalizeJob(raw as Partial<NormalizedJob> & Record<string, unknown>);
  return undefined;
}

function buildListFilter(command: CareerCommand): ApplicationPacketListFilter {
  const payload = isRecord(command.payload) ? command.payload : {};
  return {
    userId: optionalStringFrom(payload.userId ?? command.userId),
    jobId: optionalStringFrom(payload.jobId),
    status: parseStatus(payload.status),
    limit: numberFrom(payload.limit)
  };
}

async function emitPacketEvent(context: ApplicationPacketContext, eventType: string, command: CareerCommand, packet: ApplicationPacketRecord, evidence?: unknown) {
  return context.eventStore.append({
    eventType,
    entityType: "application_packet",
    entityId: packet.id,
    domain: definition.slug,
    manager: definition.manager,
    capability: "ApplicationPacketAssemblyCapability",
    worker: "ApplicationPacketWorker",
    userId: packet.userId ?? command.userId,
    payload: { commandId: command.id, packet, externalActionTaken: false, reviewRequired: true },
    evidence,
    confidence: 1
  });
}

async function writePacketProjections(context: ApplicationPacketContext, packet: ApplicationPacketRecord, sourceEventId?: string) {
  await context.stateStore.upsertProjection({
    userId: packet.userId,
    projectionType: APPLICATION_PACKET_CURRENT_PROJECTION,
    entityType: "application_packet",
    entityId: packet.id,
    sourceEventId,
    data: { packet, updatedAt: new Date().toISOString(), externalActionTaken: false },
    updatedAt: new Date()
  });
  await context.stateStore.upsertProjection({
    userId: packet.userId,
    projectionType: APPLICATION_PACKET_REVIEW_QUEUE_PROJECTION,
    entityType: "application_packet",
    entityId: packet.id,
    sourceEventId,
    data: {
      packetId: packet.id,
      jobId: packet.jobId,
      status: packet.status,
      nextAction: packet.nextAction,
      reviewRequired: ["generated", "awaiting_review", "ready_to_apply"].includes(packet.status),
      drafts: {
        resume: packet.resumePlaceholder,
        coverLetter: packet.coverLetterPlaceholder,
        recruiterMessage: packet.recruiterMessagePlaceholder
      },
      updatedAt: new Date().toISOString(),
      externalActionTaken: false
    },
    updatedAt: new Date()
  });
}

export class ApplicationPacketManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "ApplicationPacketAssemblyCapability",
      workers: ["ApplicationPacketWorker"],
      commands: COMMANDS,
      events: definition.events,
      permissions: definition.permissions
    }
  ];

  canHandle(command: CareerCommand) {
    return COMMANDS.includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    if (!this.canHandle(command)) return validationError(command, "COMMAND_NOT_SUPPORTED", `${this.domainName} cannot handle ${command.type}`);
    const executionContext = context as ApplicationPacketContext;
    const store = executionContext.applicationPacketStore ?? prismaApplicationPacketStore;

    if (command.type === APPLICATION_PACKETS_LIST_COMMAND) {
      const applicationPackets = await store.list(buildListFilter(command));
      return { ok: true, status: "completed", commandId: command.id, data: { applicationPackets }, updatedProjections: [] };
    }

    if (command.type === APPLICATION_PACKETS_GET_COMMAND) {
      const id = packetIdFrom(command);
      const payload = isRecord(command.payload) ? command.payload : {};
      if (!id) return validationError(command, "PACKET_ID_REQUIRED", "application_packets.get requires an application packet id.");
      const userId = optionalStringFrom(command.userId ?? payload.userId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "application_packets.get requires an authenticated user id.");
      const packet = await store.getById(id, userId);
      if (!packet) return validationError(command, "PACKET_NOT_FOUND", `Application packet not found: ${id}`);
      return { ok: true, status: "completed", commandId: command.id, data: packet, updatedProjections: [] };
    }

    if (command.type === APPLICATION_PACKETS_UPDATE_STATUS_COMMAND) {
      const payload = isRecord(command.payload) ? command.payload as StatusPayload : {};
      const id = packetIdFrom(command);
      const status = parseStatus(payload.status);
      if (!id) return validationError(command, "PACKET_ID_REQUIRED", "application_packets.update_status requires an application packet id.");
      if (!status) return validationError(command, "PACKET_STATUS_INVALID", "application_packets.update_status requires a valid status.");
      const userId = optionalStringFrom(command.userId ?? payload.userId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "application_packets.update_status requires an authenticated user id.");
      const packet = await updateApplicationPacketStatus(id, status, store, optionalStringFrom(payload.nextAction), userId);
      const event = await emitPacketEvent(executionContext, APPLICATION_PACKET_STATUS_UPDATED_EVENT, command, packet, { manualOnly: true });
      await emitPacketEvent(executionContext, APPLICATION_PACKET_UPDATED_EVENT, command, packet, { status });
      await writePacketProjections(executionContext, packet, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: packet, emittedEvents: [APPLICATION_PACKET_STATUS_UPDATED_EVENT, APPLICATION_PACKET_UPDATED_EVENT], updatedProjections: [APPLICATION_PACKET_CURRENT_PROJECTION, APPLICATION_PACKET_REVIEW_QUEUE_PROJECTION] };
    }

    if (command.type === APPLICATION_PACKETS_GENERATE_PLACEHOLDERS_COMMAND) {
      const id = packetIdFrom(command);
      const payload = isRecord(command.payload) ? command.payload : {};
      if (!id) return validationError(command, "PACKET_ID_REQUIRED", "application_packets.generate_placeholders requires an application packet id.");
      const userId = optionalStringFrom(command.userId ?? payload.userId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "application_packets.generate_placeholders requires an authenticated user id.");
      const existing = await store.getById(id, userId);
      if (!existing) return validationError(command, "PACKET_NOT_FOUND", `Application packet not found: ${id}`);
      const packet = await generatePacketPlaceholders(id, store, userId);
      const events = await Promise.all([
        emitPacketEvent(executionContext, RESUME_PLACEHOLDER_CREATED_EVENT, command, packet, { truthfulnessContract: "verified-facts-only" }),
        emitPacketEvent(executionContext, COVER_LETTER_PLACEHOLDER_CREATED_EVENT, command, packet, { truthfulnessContract: "verified-facts-only" }),
        emitPacketEvent(executionContext, RECRUITER_MESSAGE_PLACEHOLDER_CREATED_EVENT, command, packet, { manualSendOnly: true }),
        emitPacketEvent(executionContext, APPLICATION_PACKET_UPDATED_EVENT, command, packet, { generatedDraftFields: true })
      ]);
      await writePacketProjections(executionContext, packet, events[3].id);
      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: packet,
        emittedEvents: [RESUME_PLACEHOLDER_CREATED_EVENT, COVER_LETTER_PLACEHOLDER_CREATED_EVENT, RECRUITER_MESSAGE_PLACEHOLDER_CREATED_EVENT, APPLICATION_PACKET_UPDATED_EVENT],
        updatedProjections: [APPLICATION_PACKET_CURRENT_PROJECTION, APPLICATION_PACKET_REVIEW_QUEUE_PROJECTION]
      };
    }

    const payload = isRecord(command.payload) ? command.payload as CreatePayload : {};
    const jobId = optionalStringFrom(payload.jobId ?? command.entityId);
    if (!jobId) return validationError(command, "JOB_ID_REQUIRED", "application_packets.create requires a jobId.");
    const currentUserId = optionalStringFrom(command.userId ?? payload.userId);
    if (!currentUserId) return validationError(command, "USER_ID_REQUIRED", "application_packets.create requires an authenticated user id.");
    const persistedJob = await executionContext.jobStore?.getById(jobId, currentUserId);
    const selectedJob = rawJobFromPayload(payload, persistedJob);
    if (!selectedJob) return validationError(command, "SELECTED_JOB_REQUIRED", "application_packets.create requires a persisted jobId or selectedJob payload.");
    const selectedCompany = normalizeParty(payload.selectedCompany) ?? persistedJob?.company ?? { id: optionalStringFrom(payload.companyId) ?? persistedJob?.companyId, name: selectedJob.company };
    const packet = await createApplicationPacket({
      id: optionalStringFrom(payload.id ?? payload.packetId),
      userId: currentUserId,
      jobId,
      companyId: optionalStringFrom(payload.companyId) ?? persistedJob?.companyId ?? selectedCompany.id,
      personId: optionalStringFrom(payload.personId),
      selectedJob,
      selectedCompany,
      selectedPerson: normalizeParty(payload.selectedPerson),
      fitScoreSummary: fitScoreSummaryFrom(payload, selectedJob, persistedJob),
      notes: stringArrayFrom(payload.notes)
    }, store);
    const event = await emitPacketEvent(executionContext, APPLICATION_PACKET_CREATED_EVENT, command, packet, { sourceJobId: jobId, manualOnly: true });
    await writePacketProjections(executionContext, packet, event.id);
    return { ok: true, status: "completed", commandId: command.id, data: packet, emittedEvents: [APPLICATION_PACKET_CREATED_EVENT], updatedProjections: [APPLICATION_PACKET_CURRENT_PROJECTION, APPLICATION_PACKET_REVIEW_QUEUE_PROJECTION] };
  }
}

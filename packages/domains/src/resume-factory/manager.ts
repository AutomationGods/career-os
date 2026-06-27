import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { prismaProfileFactsStore, selectBlockedClaimLabels, selectResumeAllowedFacts, type ProfileFactRecord, type ProfileFactsStore } from "../identity/profile-facts-service";
import { resumeGenerationCapability } from "./capabilities";
import { prismaResumeVersionStore, type ResumeVersionRecord, type ResumeVersionStore } from "./resume-version-store";
import { buildResumeReviewChecklist, listResumeTemplates } from "./resume-templates";
import { buildTechnicalResumeDraft, normalizeVerifiedFacts, type TechnicalResumeDraft } from "./workers/technical-resume-worker";
import { assessResumeTruthfulness, type TruthfulnessGuardResult } from "./workers/truthfulness-guard-worker";

export const RESUME_GENERATE_COMMAND = "resume.generate";
export const RESUME_GENERATE_PLACEHOLDER_COMMAND = "resume.generate_placeholder";
export const RESUME_TEMPLATES_LIST_COMMAND = "resume.templates.list";
export const RESUME_REVIEW_CHECKLIST_GENERATE_COMMAND = "resume.review_checklist.generate";
export const RESUME_GENERATED_EVENT = "resume.generated";
export const RESUME_PLACEHOLDER_CREATED_EVENT = "resume.placeholder_created";
export const RESUME_TEMPLATE_SELECTED_EVENT = "resume.template_selected";
export const RESUME_REVIEW_CHECKLIST_CREATED_EVENT = "resume.review_checklist_created";
export const RESUME_CURRENT_DRAFT_PROJECTION = "resume.current_draft";
export const RESUME_REVIEW_QUEUE_PROJECTION = "resume.review_queue";
export const RESUME_TEMPLATE_CATALOG_PROJECTION = "resume.template_catalog";
export const RESUME_SOURCE_INPUT_SNAPSHOT = "resume.source_input";
export const PROFILE_FACTS_USED_BY_RESUME_FACTORY_EVENT = "profile_facts.used_by_resume_factory";

export const RESUME_FACTORY_DEMO_USER_ID = "demo-user";

export const FALLBACK_DEMO_VERIFIED_FACTS = [
  "Built Splunk SIEM dashboards and saved searches for security monitoring.",
  "Implemented Cribl pipelines for routing, filtering, and normalizing observability data.",
  "Performed log onboarding for Linux, AWS, Azure, and GCP sources into security data pipelines.",
  "Managed Terraform modules for cloud observability infrastructure."
];

export const FALLBACK_DEMO_FACTS_WARNING = "Using fallback demo facts because no profile facts exist yet.";

export const definition: DomainDefinition = {
  name: "Resume Factory Domain",
  slug: "resume-factory",
  manager: "Resume Factory Manager",
  capabilities: ["ResumeGenerationCapability"],
  workers: ["TechnicalResumeWorker", "TruthfulnessGuardWorker"],
  tools: ["TruthfulnessGuardTool"],
  commands: [RESUME_GENERATE_COMMAND, RESUME_GENERATE_PLACEHOLDER_COMMAND, RESUME_TEMPLATES_LIST_COMMAND, RESUME_REVIEW_CHECKLIST_GENERATE_COMMAND],
  events: [RESUME_GENERATED_EVENT, RESUME_PLACEHOLDER_CREATED_EVENT, RESUME_TEMPLATE_SELECTED_EVENT, RESUME_REVIEW_CHECKLIST_CREATED_EVENT, PROFILE_FACTS_USED_BY_RESUME_FACTORY_EVENT],
  permissions: ["generate_resume"],
  dependencies: ["application-packet", "event-store", "state-store", "snapshot-store"],
  status: "implemented",
  version: "1.0.0"
};

export interface ResumeGenerationRequest {
  userId?: string;
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  verifiedFacts: string[];
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  targetKeywords?: string[];
  templateKey?: string;
  sectionOrder?: string[];
  masterResumeId?: string;
}

export interface ResumeGenerationResult {
  draft: TechnicalResumeDraft;
  guard: TruthfulnessGuardResult;
  reviewRequired: true;
  sourceSnapshotId: string;
  warnings: string[];
  blockedProfileClaims?: string[];
  usedProfileFacts?: boolean;
  resumeVersion?: ResumeVersionRecord;
}

export interface ResumeGenerationPlaceholder extends ResumeGenerationRequest {
  eventType: typeof RESUME_PLACEHOLDER_CREATED_EVENT;
  content: string;
  warnings: string[];
}

type ResumeGenerationPayload = Partial<ResumeGenerationRequest> & Record<string, unknown>;

type ResumeFactoryContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
  profileFactsStore?: ProfileFactsStore;
  resumeVersionStore?: ResumeVersionStore;
};

function isResumeGenerationPayload(payload: unknown): payload is ResumeGenerationPayload {
  return typeof payload === "object" && payload !== null;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringFrom(value: unknown) {
  const text = stringFrom(value);
  return text.length > 0 ? text : undefined;
}

function stringArrayFrom(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function validationError(command: CareerCommand, code: string, message: string): CommandResult {
  return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
}

function buildRequest(command: CareerCommand): ResumeGenerationRequest | CommandResult {
  if (!isResumeGenerationPayload(command.payload)) {
    return validationError(command, "RESUME_PAYLOAD_REQUIRED", "Resume generation requires an object payload.");
  }

  const payload = command.payload;
  const request: ResumeGenerationRequest = {
    userId: optionalStringFrom(payload.userId),
    jobId: stringFrom(payload.jobId ?? command.entityId),
    companyId: stringFrom(payload.companyId),
    applicationPacketId: stringFrom(payload.applicationPacketId ?? command.entityId),
    resumeVersionId: optionalStringFrom(payload.resumeVersionId),
    verifiedFacts: normalizeVerifiedFacts(stringArrayFrom(payload.verifiedFacts)),
    targetRole: optionalStringFrom(payload.targetRole ?? payload.jobTitle),
    companyName: optionalStringFrom(payload.companyName),
    jobDescription: optionalStringFrom(payload.jobDescription),
    targetKeywords: stringArrayFrom(payload.targetKeywords),
    templateKey: optionalStringFrom(payload.templateKey),
    sectionOrder: stringArrayFrom(payload.sectionOrder),
    masterResumeId: optionalStringFrom(payload.masterResumeId)
  };

  if (!request.jobId) return validationError(command, "JOB_ID_REQUIRED", "jobId is required for resume generation.");
  if (!request.companyId) return validationError(command, "COMPANY_ID_REQUIRED", "companyId is required for resume generation.");
  if (!request.applicationPacketId) return validationError(command, "APPLICATION_PACKET_ID_REQUIRED", "applicationPacketId is required for resume generation.");

  return request;
}

async function resolveResumeFacts(request: ResumeGenerationRequest, context: ResumeFactoryContext) {
  const warnings: string[] = [];
  let profileFacts: ProfileFactRecord[] = [];
  let verifiedFacts = request.verifiedFacts;
  let blockedProfileClaims: string[] = [];
  let usedProfileFacts = false;

  if (request.userId) {
    const store = context.profileFactsStore ?? prismaProfileFactsStore;
    profileFacts = await store.list({ userId: request.userId, filter: "all" });
    if (profileFacts.length > 0) {
      verifiedFacts = normalizeVerifiedFacts(selectResumeAllowedFacts(profileFacts));
      blockedProfileClaims = selectBlockedClaimLabels(profileFacts);
      usedProfileFacts = true;
    }
  }

  if (request.userId === RESUME_FACTORY_DEMO_USER_ID && profileFacts.length === 0 && verifiedFacts.length === 0) {
    verifiedFacts = FALLBACK_DEMO_VERIFIED_FACTS;
    warnings.push(FALLBACK_DEMO_FACTS_WARNING);
  }

  return { verifiedFacts, blockedProfileClaims, usedProfileFacts, profileFacts, warnings };
}

function isCommandResult(value: ResumeGenerationRequest | CommandResult): value is CommandResult {
  return "ok" in value && "status" in value && "commandId" in value;
}

export class ResumeFactoryManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [resumeGenerationCapability];

  canHandle(command: CareerCommand) {
    return [RESUME_GENERATE_COMMAND, RESUME_GENERATE_PLACEHOLDER_COMMAND, RESUME_TEMPLATES_LIST_COMMAND, RESUME_REVIEW_CHECKLIST_GENERATE_COMMAND].includes(command.type);
  }

  createPlaceholder(request: ResumeGenerationRequest): ResumeGenerationPlaceholder {
    return {
      ...request,
      eventType: RESUME_PLACEHOLDER_CREATED_EVENT,
      content: "Resume placeholder only. AI generation/export is gated behind truthfulness checks and human approval.",
      warnings: ["Do not invent certifications, companies, dates, clearance, tools, or experience."]
    };
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult<ResumeGenerationResult>> {
    const executionContext = context as ResumeFactoryContext;

    if (command.type === RESUME_TEMPLATES_LIST_COMMAND) {
      const templates = listResumeTemplates();
      await executionContext.stateStore.upsertProjection({
        userId: command.userId,
        projectionType: RESUME_TEMPLATE_CATALOG_PROJECTION,
        entityType: "resume_template_catalog",
        entityId: "default",
        data: { templates, updatedAt: new Date().toISOString() },
        updatedAt: new Date()
      });
      return { ok: true, status: "completed", commandId: command.id, data: { templates }, updatedProjections: [RESUME_TEMPLATE_CATALOG_PROJECTION] } as unknown as CommandResult<ResumeGenerationResult>;
    }

    if (command.type === RESUME_REVIEW_CHECKLIST_GENERATE_COMMAND) {
      const payload = isResumeGenerationPayload(command.payload) ? command.payload : {};
      const checklist = buildResumeReviewChecklist({
        matchedFactCount: typeof payload.matchedFactCount === "number" ? payload.matchedFactCount : 0,
        sourceFactCount: typeof payload.sourceFactCount === "number" ? payload.sourceFactCount : 0,
        missingKeywords: stringArrayFrom(payload.missingKeywords),
        blockedProfileClaims: stringArrayFrom(payload.blockedProfileClaims),
        templateKey: optionalStringFrom(payload.templateKey) ?? "ats-technical-v2"
      });
      const event = await executionContext.eventStore.append({
        eventType: RESUME_REVIEW_CHECKLIST_CREATED_EVENT,
        entityType: "resume",
        entityId: command.entityId ?? command.id,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "TruthfulnessGuardWorker",
        userId: command.userId,
        payload: { commandId: command.id, checklist },
        confidence: 1
      });
      await executionContext.stateStore.upsertProjection({
        userId: command.userId,
        projectionType: RESUME_REVIEW_QUEUE_PROJECTION,
        entityType: "resume",
        entityId: command.entityId ?? command.id,
        sourceEventId: event.id,
        data: { checklist, updatedAt: new Date().toISOString() },
        updatedAt: new Date()
      });
      return { ok: true, status: "completed", commandId: command.id, data: { checklist }, emittedEvents: [RESUME_REVIEW_CHECKLIST_CREATED_EVENT], updatedProjections: [RESUME_REVIEW_QUEUE_PROJECTION] } as unknown as CommandResult<ResumeGenerationResult>;
    }

    const requestOrError = buildRequest(command);
    if (isCommandResult(requestOrError)) return requestOrError as CommandResult<ResumeGenerationResult>;

    const request = requestOrError;
    const versionStore = executionContext.resumeVersionStore ?? prismaResumeVersionStore;
    const resolvedFacts = await resolveResumeFacts(request, executionContext);
    if (resolvedFacts.verifiedFacts.length === 0) return validationError(command, "VERIFIED_FACTS_REQUIRED", "At least one verified profile fact is required; Resume Factory will not invent content.") as CommandResult<ResumeGenerationResult>;
    const resolvedRequest = { ...request, verifiedFacts: resolvedFacts.verifiedFacts };
    const draft = buildTechnicalResumeDraft({ ...resolvedRequest, blockedProfileClaims: resolvedFacts.blockedProfileClaims });
    const guard = assessResumeTruthfulness({ draft, verifiedFacts: resolvedFacts.verifiedFacts });

    if (!guard.ok) {
      return {
        ok: false,
        status: "rejected",
        commandId: command.id,
        error: {
          code: "UNSUPPORTED_RESUME_CLAIMS_BLOCKED",
          message: "Resume draft contains claims not grounded in verifiedFacts.",
          details: { blockedClaims: [...guard.blockedClaims, ...resolvedFacts.blockedProfileClaims] }
        }
      };
    }

    const resumeVersion = await versionStore.save({
      draft,
      masterResumeId: resolvedRequest.masterResumeId,
      templateKey: draft.templateKey,
      sectionOrder: draft.sectionOrder,
      reviewChecklist: draft.reviewChecklist
    });

    const sourceSnapshot = await executionContext.snapshotStore.captureSnapshot({
      userId: resolvedRequest.userId,
      entityType: "application_packet",
      entityId: resolvedRequest.applicationPacketId,
      snapshotType: RESUME_SOURCE_INPUT_SNAPSHOT,
      source: RESUME_SOURCE_INPUT_SNAPSHOT,
      data: {
        commandId: command.id,
        request: resolvedRequest,
        originalRequest: request,
        profileFactIds: resolvedFacts.profileFacts.map((fact) => fact.id),
        templateKey: draft.templateKey,
        sectionOrder: draft.sectionOrder,
        reviewChecklist: draft.reviewChecklist,
        capturedFor: draft.id
      }
    });

    const generatedEvent = await executionContext.eventStore.append({
      eventType: RESUME_GENERATED_EVENT,
      entityType: "resume",
      entityId: draft.id,
      domain: definition.slug,
      manager: definition.manager,
      capability: "ResumeGenerationCapability",
      worker: "TechnicalResumeWorker",
      userId: command.userId,
      payload: {
        commandId: command.id,
        applicationPacketId: resolvedRequest.applicationPacketId,
        jobId: resolvedRequest.jobId,
        companyId: resolvedRequest.companyId,
        userId: resolvedRequest.userId,
        draft,
        guard,
        reviewRequired: true,
        warnings: [...draft.warnings, ...guard.warnings, ...resolvedFacts.warnings],
        blockedProfileClaims: resolvedFacts.blockedProfileClaims,
        usedProfileFacts: resolvedFacts.usedProfileFacts,
        resumeVersionId: resumeVersion.id,
        templateKey: draft.templateKey,
        reviewChecklist: draft.reviewChecklist
      },
      evidence: {
        verifiedFacts: resolvedFacts.verifiedFacts,
        blockedProfileClaims: resolvedFacts.blockedProfileClaims,
        sourceSnapshotId: sourceSnapshot.id,
        truthfulnessContract: "verified-facts-only"
      },
      confidence: 1
    });

    const templateEvent = await executionContext.eventStore.append({
      eventType: RESUME_TEMPLATE_SELECTED_EVENT,
      entityType: "resume",
      entityId: draft.id,
      domain: definition.slug,
      manager: definition.manager,
      capability: "ResumeGenerationCapability",
      worker: "TechnicalResumeWorker",
      userId: command.userId,
      payload: { commandId: command.id, draftId: draft.id, templateKey: draft.templateKey, templateName: draft.templateName, sectionOrder: draft.sectionOrder },
      evidence: { generatedEventId: generatedEvent.id },
      confidence: 1
    });

    const checklistEvent = await executionContext.eventStore.append({
      eventType: RESUME_REVIEW_CHECKLIST_CREATED_EVENT,
      entityType: "resume",
      entityId: draft.id,
      domain: definition.slug,
      manager: definition.manager,
      capability: "ResumeGenerationCapability",
      worker: "TruthfulnessGuardWorker",
      userId: command.userId,
      payload: { commandId: command.id, draftId: draft.id, checklist: draft.reviewChecklist },
      evidence: { generatedEventId: generatedEvent.id, templateEventId: templateEvent.id },
      confidence: 1
    });

    if (resolvedFacts.usedProfileFacts && resolvedRequest.userId) {
      await executionContext.eventStore.append({
        eventType: PROFILE_FACTS_USED_BY_RESUME_FACTORY_EVENT,
        entityType: "user",
        entityId: resolvedRequest.userId,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "TechnicalResumeWorker",
        payload: {
          commandId: command.id,
          draftId: draft.id,
          profileFactIds: resolvedFacts.profileFacts.map((fact) => fact.id),
          verifiedFacts: resolvedFacts.verifiedFacts,
          blockedProfileClaims: resolvedFacts.blockedProfileClaims
        },
        evidence: { generatedEventId: generatedEvent.id },
        confidence: 1
      });
    }

    if (command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND) {
      await executionContext.eventStore.append({
        eventType: RESUME_PLACEHOLDER_CREATED_EVENT,
        entityType: "resume",
        entityId: draft.id,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "TechnicalResumeWorker",
        userId: command.userId,
        payload: {
          commandId: command.id,
          draftId: draft.id,
          legacyAliasFor: RESUME_GENERATED_EVENT
        },
        evidence: { generatedEventId: generatedEvent.id },
        confidence: 1
      });
    }

    await executionContext.stateStore.upsertProjection({
      userId: resolvedRequest.userId,
      projectionType: RESUME_CURRENT_DRAFT_PROJECTION,
      entityType: "application_packet",
      entityId: resolvedRequest.applicationPacketId,
      sourceEventId: generatedEvent.id,
      data: {
        draft,
        guard,
        reviewRequired: true,
        sourceSnapshotId: sourceSnapshot.id,
        sourceEventId: generatedEvent.id,
        blockedProfileClaims: resolvedFacts.blockedProfileClaims,
        usedProfileFacts: resolvedFacts.usedProfileFacts,
        resumeVersion,
        templateKey: draft.templateKey,
        reviewChecklist: draft.reviewChecklist,
        updatedByCommandId: command.id
      },
      updatedAt: new Date()
    });

    await executionContext.stateStore.upsertProjection({
      userId: resolvedRequest.userId,
      projectionType: RESUME_REVIEW_QUEUE_PROJECTION,
      entityType: "resume",
      entityId: draft.id,
      sourceEventId: checklistEvent.id,
      data: { draftId: draft.id, checklist: draft.reviewChecklist, blockedProfileClaims: resolvedFacts.blockedProfileClaims, missingKeywords: draft.missingKeywords, updatedAt: new Date().toISOString() },
      updatedAt: new Date()
    });

    const emittedEvents = command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND ? [RESUME_GENERATED_EVENT, RESUME_TEMPLATE_SELECTED_EVENT, RESUME_REVIEW_CHECKLIST_CREATED_EVENT, RESUME_PLACEHOLDER_CREATED_EVENT] : [RESUME_GENERATED_EVENT, RESUME_TEMPLATE_SELECTED_EVENT, RESUME_REVIEW_CHECKLIST_CREATED_EVENT];

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: {
        draft,
        guard,
        reviewRequired: true,
        sourceSnapshotId: sourceSnapshot.id,
        warnings: [...draft.warnings, ...guard.warnings, ...resolvedFacts.warnings],
        blockedProfileClaims: resolvedFacts.blockedProfileClaims,
        usedProfileFacts: resolvedFacts.usedProfileFacts,
        resumeVersion
      },
      emittedEvents,
      updatedProjections: [RESUME_CURRENT_DRAFT_PROJECTION, RESUME_REVIEW_QUEUE_PROJECTION]
    };
  }
}

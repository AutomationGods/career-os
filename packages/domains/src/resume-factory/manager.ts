import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import type { ProfileFact } from "../profile-facts/manager";
import { resumeGenerationCapability } from "./capabilities";
import {
  RESUME_CLAIM_BLOCKED_EVENT,
  RESUME_CLAIMS_FILTERED_EVENT,
  RESUME_GENERATED_EVENT,
  RESUME_GENERATION_FAILED_EVENT,
  RESUME_PLACEHOLDER_CREATED_EVENT,
  RESUME_PROFILE_FACTS_LOADED_EVENT,
  RESUME_TRUTHFULNESS_SUMMARY_CREATED_EVENT
} from "./events";
import { ProfileFactResolver, type ResolvedProfileFacts } from "./profile-fact-resolver";
import type { ResumeClaimDecision } from "./resume-claim-policy";
import { buildTechnicalResumeDraft, normalizeVerifiedFacts, type TechnicalResumeDraft } from "./workers/technical-resume-worker";
import { assessResumeTruthfulness, type TruthfulnessGuardResult } from "./workers/truthfulness-guard-worker";

export const RESUME_GENERATE_COMMAND = "resume.generate";
export const RESUME_GENERATE_PLACEHOLDER_COMMAND = "resume.generate_placeholder";
export { RESUME_GENERATED_EVENT, RESUME_GENERATION_FAILED_EVENT, RESUME_PLACEHOLDER_CREATED_EVENT };
export const RESUME_CURRENT_DRAFT_PROJECTION = "resume.current_draft";
export const RESUME_SOURCE_INPUT_SNAPSHOT = "resume.source_input";

const RESUME_SCAFFOLD_PLACEHOLDERS = ["[Add verified employer]", "[Add measurable achievement]", "[Add certification only if verified]", "[Add clearance/public trust only if verified]"];

export const definition: DomainDefinition = {
  name: "Resume Factory Domain",
  slug: "resume-factory",
  manager: "Resume Factory Manager",
  capabilities: ["ResumeGenerationCapability"],
  workers: ["ProfileFactResolver", "ResumeClaimPolicy", "TechnicalResumeWorker", "TruthfulnessGuardWorker"],
  tools: ["ProfileFactProjectionReaderTool", "ResumeClaimPolicyTool", "TruthfulnessGuardTool"],
  commands: [RESUME_GENERATE_COMMAND, RESUME_GENERATE_PLACEHOLDER_COMMAND],
  events: [RESUME_PROFILE_FACTS_LOADED_EVENT, RESUME_CLAIMS_FILTERED_EVENT, RESUME_TRUTHFULNESS_SUMMARY_CREATED_EVENT, RESUME_CLAIM_BLOCKED_EVENT, RESUME_GENERATED_EVENT, RESUME_GENERATION_FAILED_EVENT, RESUME_PLACEHOLDER_CREATED_EVENT],
  permissions: ["generate_resume"],
  dependencies: ["application-packet", "profile_facts.current", "event-store", "state-store", "snapshot-store"],
  status: "implemented",
  version: "1.1.0"
};

export interface ResumeGenerationRequest {
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  verifiedFacts: string[];
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  targetKeywords?: string[];
}

export interface ResumeTruthfulnessSummary {
  generatedFromProfileFacts: true;
  profileFactsLoaded: number;
  usedFactCount: number;
  blockedClaimCount: number;
  needsEvidenceExclusionCount: number;
  verifiedFactCount: number;
  userAssertedFactCount: number;
  inferredExcludedCount: number;
  rejectedFactCount: number;
  blockedFactCount: number;
  carefulUsageFactIds: string[];
  unsupportedClaimFactIds: string[];
  missingRequiredFacts: string[];
  notes: string[];
}

export interface ResumeGenerationResult {
  draft: TechnicalResumeDraft;
  guard: TruthfulnessGuardResult;
  reviewRequired: true;
  sourceSnapshotId: string;
  warnings: string[];
  usedFactIds: string[];
  blockedFactIds: string[];
  needsEvidenceFactIds: string[];
  truthfulnessSummary: ResumeTruthfulnessSummary;
  generatedFromProfileFacts: true;
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
    jobId: stringFrom(payload.jobId ?? command.entityId),
    companyId: stringFrom(payload.companyId),
    applicationPacketId: stringFrom(payload.applicationPacketId ?? command.entityId),
    resumeVersionId: optionalStringFrom(payload.resumeVersionId),
    verifiedFacts: normalizeVerifiedFacts(stringArrayFrom(payload.verifiedFacts)),
    targetRole: optionalStringFrom(payload.targetRole ?? payload.jobTitle),
    companyName: optionalStringFrom(payload.companyName),
    jobDescription: optionalStringFrom(payload.jobDescription),
    targetKeywords: stringArrayFrom(payload.targetKeywords)
  };

  if (!request.jobId) return validationError(command, "JOB_ID_REQUIRED", "jobId is required for resume generation.");
  if (!request.companyId) return validationError(command, "COMPANY_ID_REQUIRED", "companyId is required for resume generation.");
  if (!request.applicationPacketId) return validationError(command, "APPLICATION_PACKET_ID_REQUIRED", "applicationPacketId is required for resume generation.");

  return request;
}

function isCommandResult(value: ResumeGenerationRequest | CommandResult): value is CommandResult {
  return "ok" in value && "status" in value && "commandId" in value;
}

function factIds(facts: ProfileFact[]) {
  return facts.map((fact) => fact.id);
}

function missingRequiredFacts(allowedFacts: ProfileFact[]) {
  const categories = new Set(allowedFacts.map((fact) => fact.category));
  return [
    categories.has("work_history") ? undefined : "verified employer",
    categories.has("achievement") ? undefined : "measurable achievement",
    categories.has("certification") ? undefined : "verified certification",
    categories.has("clearance") ? undefined : "verified clearance/public trust"
  ].filter((value): value is string => Boolean(value));
}

function placeholdersForMissing(missingFacts: string[]) {
  const needed = new Set(missingFacts);
  return RESUME_SCAFFOLD_PLACEHOLDERS.filter((placeholder) => {
    if (placeholder.includes("employer")) return needed.has("verified employer");
    if (placeholder.includes("achievement")) return needed.has("measurable achievement");
    if (placeholder.includes("certification")) return needed.has("verified certification");
    if (placeholder.includes("clearance")) return needed.has("verified clearance/public trust");
    return false;
  });
}

function buildTruthfulnessSummary(resolved: ResolvedProfileFacts, allowedDecisions: ResumeClaimDecision[], blockedDecisions: ResumeClaimDecision[], needsEvidenceFactIds: string[], missingFacts: string[]): ResumeTruthfulnessSummary {
  const carefulUsageFactIds = allowedDecisions.filter((decision) => decision.carefulPhrasingRequired).map((decision) => decision.fact.id);
  const unsupportedClaimFactIds = blockedDecisions.filter((decision) => decision.reasons.includes("unsupported_formal_claim") || decision.reasons.includes("public_trust_not_security_clearance")).map((decision) => decision.fact.id);
  return {
    generatedFromProfileFacts: true,
    profileFactsLoaded: resolved.allFacts.length,
    usedFactCount: allowedDecisions.length,
    blockedClaimCount: blockedDecisions.length,
    needsEvidenceExclusionCount: needsEvidenceFactIds.length,
    verifiedFactCount: resolved.verifiedFacts.length,
    userAssertedFactCount: resolved.userAssertedFacts.length,
    inferredExcludedCount: resolved.inferredFacts.length,
    rejectedFactCount: resolved.rejectedFacts.length,
    blockedFactCount: resolved.blockedFacts.length,
    carefulUsageFactIds,
    unsupportedClaimFactIds,
    missingRequiredFacts: missingFacts,
    notes: [
      "Resume Factory used profile_facts.current as the source of truth.",
      "Verified and carefully handled user-asserted facts can be used only when resume usage is allowed and not blocked.",
      "Inferred, needs-evidence, rejected, blocked, and unsupported formal claims were excluded from the draft.",
      "Public Trust is never upgraded into a security clearance."
    ]
  };
}

export class ResumeFactoryManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [resumeGenerationCapability];

  canHandle(command: CareerCommand) {
    return command.type === RESUME_GENERATE_COMMAND || command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND;
  }

  createPlaceholder(request: ResumeGenerationRequest): ResumeGenerationPlaceholder {
    return {
      ...request,
      eventType: RESUME_PLACEHOLDER_CREATED_EVENT,
      content: RESUME_SCAFFOLD_PLACEHOLDERS.join("\n"),
      warnings: ["Do not invent certifications, companies, dates, clearance, tools, or experience."]
    };
  }

  private async emitGenerationFailed(command: CareerCommand, context: ResumeFactoryContext, code: string, message: string, details?: unknown) {
    await context.eventStore.append({
      eventType: RESUME_GENERATION_FAILED_EVENT,
      entityType: command.entityType ?? "resume",
      entityId: command.entityId ?? command.id,
      domain: definition.slug,
      manager: definition.manager,
      capability: "ResumeGenerationCapability",
      worker: "ResumeFactoryManager",
      userId: command.userId,
      payload: { commandId: command.id, code, message, details },
      confidence: 1
    });
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult<ResumeGenerationResult>> {
    const executionContext = context as ResumeFactoryContext;
    const requestOrError = buildRequest(command);
    if (isCommandResult(requestOrError)) {
      await this.emitGenerationFailed(command, executionContext, requestOrError.error?.code ?? "RESUME_GENERATION_REJECTED", requestOrError.error?.message ?? "Resume generation rejected.");
      return requestOrError as CommandResult<ResumeGenerationResult>;
    }

    const request = requestOrError;

    try {
      const resolver = new ProfileFactResolver(executionContext.stateStore);
      const resolved = await resolver.resolve(command.userId);
      await executionContext.eventStore.append({
        eventType: RESUME_PROFILE_FACTS_LOADED_EVENT,
        entityType: "application_packet",
        entityId: request.applicationPacketId,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "ProfileFactResolver",
        userId: command.userId,
        payload: { commandId: command.id, projectionType: "profile_facts.current", loadedFactCount: resolved.allFacts.length, sourceProjectionIds: resolved.sourceProjectionIds },
        confidence: 1
      });

      const allowedDecisions = resolved.decisions.filter((decision) => decision.allowed);
      const blockedDecisions = resolved.decisions.filter((decision) => !decision.allowed);
      const needsEvidenceFactIds = [...new Set(resolved.needsEvidenceFacts.map((fact) => fact.id))];
      const blockedFactIds = [...new Set(blockedDecisions.map((decision) => decision.fact.id))];
      const usedFactIds = allowedDecisions.map((decision) => decision.fact.id);
      const allowedClaims = allowedDecisions.map((decision) => decision.resumeClaim ?? decision.fact.claim);
      const missingFacts = missingRequiredFacts(allowedDecisions.map((decision) => decision.fact));
      const scaffoldPlaceholders = command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND || allowedClaims.length === 0 ? placeholdersForMissing(missingFacts) : [];
      const truthfulnessSummary = buildTruthfulnessSummary(resolved, allowedDecisions, blockedDecisions, needsEvidenceFactIds, missingFacts);

      await executionContext.eventStore.append({
        eventType: RESUME_CLAIMS_FILTERED_EVENT,
        entityType: "application_packet",
        entityId: request.applicationPacketId,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "ResumeClaimPolicy",
        userId: command.userId,
        payload: { commandId: command.id, usedFactIds, blockedFactIds, needsEvidenceFactIds, blockedClaimCount: blockedDecisions.length },
        confidence: 1
      });

      await Promise.all(blockedDecisions.map((decision) => executionContext.eventStore.append({
        eventType: RESUME_CLAIM_BLOCKED_EVENT,
        entityType: "profile_fact",
        entityId: decision.fact.id,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "ResumeClaimPolicy",
        userId: command.userId,
        payload: { commandId: command.id, applicationPacketId: request.applicationPacketId, factId: decision.fact.id, reasons: decision.reasons },
        confidence: 1
      })));

      await executionContext.eventStore.append({
        eventType: RESUME_TRUTHFULNESS_SUMMARY_CREATED_EVENT,
        entityType: "application_packet",
        entityId: request.applicationPacketId,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "ResumeClaimPolicy",
        userId: command.userId,
        payload: { commandId: command.id, truthfulnessSummary },
        confidence: 1
      });

      const draft = buildTechnicalResumeDraft({ ...request, verifiedFacts: allowedClaims, scaffoldPlaceholders });
      const guard = assessResumeTruthfulness({ draft, verifiedFacts: allowedClaims });

      if (!guard.ok) {
        await this.emitGenerationFailed(command, executionContext, "UNSUPPORTED_RESUME_CLAIMS_BLOCKED", "Resume draft contains claims not grounded in resume-allowed profile facts.", { blockedClaims: guard.blockedClaims });
        return {
          ok: false,
          status: "rejected",
          commandId: command.id,
          error: {
            code: "UNSUPPORTED_RESUME_CLAIMS_BLOCKED",
            message: "Resume draft contains claims not grounded in resume-allowed profile facts.",
            details: { blockedClaims: guard.blockedClaims }
          },
          emittedEvents: [RESUME_PROFILE_FACTS_LOADED_EVENT, RESUME_CLAIMS_FILTERED_EVENT, RESUME_TRUTHFULNESS_SUMMARY_CREATED_EVENT, RESUME_GENERATION_FAILED_EVENT]
        };
      }

      const sourceSnapshot = await executionContext.snapshotStore.captureSnapshot({
        userId: command.userId,
        entityType: "application_packet",
        entityId: request.applicationPacketId,
        snapshotType: RESUME_SOURCE_INPUT_SNAPSHOT,
        source: RESUME_SOURCE_INPUT_SNAPSHOT,
        data: {
          commandId: command.id,
          request: { ...request, verifiedFacts: [] },
          profileFactsProjectionType: "profile_facts.current",
          usedFactIds,
          blockedFactIds,
          needsEvidenceFactIds,
          blockedDiagnostics: blockedDecisions.map((decision) => ({ factId: decision.fact.id, reasons: decision.reasons })),
          truthfulnessSummary,
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
          applicationPacketId: request.applicationPacketId,
          jobId: request.jobId,
          companyId: request.companyId,
          draft,
          guard,
          reviewRequired: true,
          usedFactIds,
          blockedFactIds,
          needsEvidenceFactIds,
          truthfulnessSummary,
          generatedFromProfileFacts: true,
          warnings: [...draft.warnings, ...guard.warnings]
        },
        evidence: {
          profileFactsProjectionType: "profile_facts.current",
          usedFactIds,
          sourceSnapshotId: sourceSnapshot.id,
          truthfulnessContract: "profile-facts-resume-allowed-only"
        },
        confidence: 1
      });

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
            createdFromAllowedProfileFactsOnly: true,
            legacyAliasFor: RESUME_GENERATED_EVENT
          },
          evidence: { generatedEventId: generatedEvent.id, profileFactsProjectionType: "profile_facts.current", usedFactIds },
          confidence: 1
        });
      }

      await executionContext.stateStore.upsertProjection({
        userId: command.userId,
        projectionType: RESUME_CURRENT_DRAFT_PROJECTION,
        entityType: "application_packet",
        entityId: request.applicationPacketId,
        sourceEventId: generatedEvent.id,
        data: {
          draft,
          guard,
          reviewRequired: true,
          sourceSnapshotId: sourceSnapshot.id,
          sourceEventId: generatedEvent.id,
          updatedByCommandId: command.id,
          usedFactIds,
          blockedFactIds,
          needsEvidenceFactIds,
          truthfulnessSummary,
          generatedFromProfileFacts: true
        },
        updatedAt: new Date()
      });

      const emittedEvents = [
        RESUME_PROFILE_FACTS_LOADED_EVENT,
        RESUME_CLAIMS_FILTERED_EVENT,
        ...(blockedDecisions.length > 0 ? [RESUME_CLAIM_BLOCKED_EVENT] : []),
        RESUME_TRUTHFULNESS_SUMMARY_CREATED_EVENT,
        RESUME_GENERATED_EVENT,
        ...(command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND ? [RESUME_PLACEHOLDER_CREATED_EVENT] : [])
      ];

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: {
          draft,
          guard,
          reviewRequired: true,
          sourceSnapshotId: sourceSnapshot.id,
          warnings: [...draft.warnings, ...guard.warnings],
          usedFactIds,
          blockedFactIds,
          needsEvidenceFactIds,
          truthfulnessSummary,
          generatedFromProfileFacts: true
        },
        emittedEvents,
        updatedProjections: [RESUME_CURRENT_DRAFT_PROJECTION]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown resume generation failure";
      await this.emitGenerationFailed(command, executionContext, "RESUME_GENERATION_FAILED", message);
      return { ok: false, status: "failed", commandId: command.id, error: { code: "RESUME_GENERATION_FAILED", message }, emittedEvents: [RESUME_GENERATION_FAILED_EVENT] };
    }
  }
}

import type { EventStore } from "@career-os/events";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { CAREER_CLAIM_CURRENT_PROJECTION, SOURCE_DOCUMENTS_CURRENT_PROJECTION, type CareerClaim, type CareerClaimCategory } from "../source-documents/manager";

export const PROFILE_FACTS_UPSERT_COMMAND = "profile_facts.upsert";
export const PROFILE_FACTS_LIST_COMMAND = "profile_facts.list";
export const PROFILE_FACTS_CREATE_FROM_CLAIMS_COMMAND = "profile_facts.create_from_claims";
export const PROFILE_FACTS_CURRENT_PROJECTION = "profile_facts.current";

export const PROFILE_FACT_UPSERT_STARTED_EVENT = "profile_fact.upsert_started";
export const PROFILE_FACT_UPSERTED_EVENT = "profile_fact.upserted";
export const PROFILE_FACT_REJECTED_EVENT = "profile_fact.rejected";
export const PROFILE_FACT_BLOCKED_EVENT = "profile_fact.blocked";
export const PROFILE_FACT_TRUTH_STATUS_CLASSIFIED_EVENT = "profile_fact.truth_status_classified";
export const PROFILE_FACT_LISTED_EVENT = "profile_fact.listed";
export const PROFILE_FACTS_CREATE_FROM_CLAIMS_STARTED_EVENT = "profile_facts.create_from_claims_started";
export const PROFILE_FACT_CREATED_FROM_CLAIM_EVENT = "profile_fact.created_from_claim";
export const PROFILE_FACTS_CREATE_FROM_CLAIMS_COMPLETED_EVENT = "profile_facts.create_from_claims_completed";
export const PROFILE_FACTS_CREATE_FROM_CLAIMS_FAILED_EVENT = "profile_facts.create_from_claims_failed";
export const PROFILE_FACT_UPSERT_FAILED_EVENT = "profile_fact.upsert_failed";
export const PROFILE_FACT_LIST_FAILED_EVENT = "profile_fact.list_failed";

export type ProfileFactCategory = "identity" | "work_history" | "skill" | "certification" | "clearance" | "education" | "project" | "achievement" | "tool" | "domain_experience" | "location" | "preference";
export type ProfileFactTruthStatus = "verified" | "user_asserted" | "inferred" | "needs_evidence" | "rejected" | "blocked";
export type ProfileFactSourceType = "user_input" | "resume_upload" | "document_upload" | "email" | "linkedin_import" | "manual_review" | "system_inference";
export type ProfileFactAllowedUse = "resume" | "cover_letter" | "recruiter_email" | "interview_prep" | "career_strategy" | "application_packet";

export interface ProfileFact {
  id: string;
  workspaceId: string;
  userId: string;
  category: ProfileFactCategory;
  claim: string;
  normalizedClaim: string;
  truthStatus: ProfileFactTruthStatus;
  sourceType: ProfileFactSourceType;
  sourceRef?: string;
  evidenceSummary?: string;
  confidence: number;
  allowedUses: ProfileFactAllowedUse[];
  blockedUses: ProfileFactAllowedUse[];
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileFactUpsertPayload {
  id?: string;
  workspaceId?: string;
  category?: ProfileFactCategory;
  claim?: string;
  truthStatus?: ProfileFactTruthStatus;
  sourceType?: ProfileFactSourceType;
  sourceRef?: string;
  evidenceSummary?: string;
  confidence?: number;
  allowedUses?: ProfileFactAllowedUse[];
  blockedUses?: ProfileFactAllowedUse[];
  expiresAt?: string;
}

export interface ProfileFactListPayload {
  workspaceId?: string;
  category?: ProfileFactCategory;
  truthStatus?: ProfileFactTruthStatus;
  allowedUse?: ProfileFactAllowedUse;
}

export interface ProfileFactUpsertResult {
  fact: ProfileFact;
  carefulPhrasingRequired: boolean;
  classificationReasons: string[];
}

export interface ProfileFactListResult {
  facts: ProfileFact[];
  total: number;
}

export interface ProfileFactsCreateFromClaimsPayload {
  workspaceId?: string;
  sourceDocumentId?: string;
}

export interface ProfileFactsCreateFromClaimsResult {
  facts: ProfileFact[];
  total: number;
  sourceClaimCount: number;
}

export const definition: DomainDefinition = {
  name: "Profile Facts Domain",
  slug: "profile-facts",
  manager: "ProfileFactsManager",
  capabilities: ["UpsertProfileFactCapability", "ListProfileFactsCapability", "ClassifyClaimTruthStatusCapability", "CreateProfileFactsFromClaimsCapability"],
  workers: ["ProfileFactUpsertWorker", "ProfileFactListWorker", "ClaimTruthStatusWorker", "ProfileFactsFromClaimsWorker"],
  tools: ["ProfileFactNormalizationTool", "TruthUsagePolicyTool"],
  commands: [PROFILE_FACTS_UPSERT_COMMAND, PROFILE_FACTS_LIST_COMMAND, PROFILE_FACTS_CREATE_FROM_CLAIMS_COMMAND],
  events: [
    PROFILE_FACT_UPSERT_STARTED_EVENT,
    PROFILE_FACT_UPSERTED_EVENT,
    PROFILE_FACT_REJECTED_EVENT,
    PROFILE_FACT_BLOCKED_EVENT,
    PROFILE_FACT_TRUTH_STATUS_CLASSIFIED_EVENT,
    PROFILE_FACT_LISTED_EVENT,
    PROFILE_FACTS_CREATE_FROM_CLAIMS_STARTED_EVENT,
    PROFILE_FACT_CREATED_FROM_CLAIM_EVENT,
    PROFILE_FACTS_CREATE_FROM_CLAIMS_COMPLETED_EVENT,
    PROFILE_FACTS_CREATE_FROM_CLAIMS_FAILED_EVENT,
    PROFILE_FACT_UPSERT_FAILED_EVENT,
    PROFILE_FACT_LIST_FAILED_EVENT
  ],
  permissions: [],
  dependencies: ["event-store", "state-store"],
  status: "partial",
  version: "0.1.0"
};

const allUses: ProfileFactAllowedUse[] = ["resume", "cover_letter", "recruiter_email", "interview_prep", "career_strategy", "application_packet"];
const formalDocumentUses: ProfileFactAllowedUse[] = ["resume", "cover_letter", "application_packet"];
const evidenceRequiredCategories = new Set<ProfileFactCategory>(["clearance"]);
const validCategories = new Set<ProfileFactCategory>(["identity", "work_history", "skill", "certification", "clearance", "education", "project", "achievement", "tool", "domain_experience", "location", "preference"]);
const validTruthStatuses = new Set<ProfileFactTruthStatus>(["verified", "user_asserted", "inferred", "needs_evidence", "rejected", "blocked"]);
const validSourceTypes = new Set<ProfileFactSourceType>(["user_input", "resume_upload", "document_upload", "email", "linkedin_import", "manual_review", "system_inference"]);

interface ClassifiedFactInput {
  category: ProfileFactCategory;
  claim: string;
  requestedTruthStatus: ProfileFactTruthStatus;
  sourceType: ProfileFactSourceType;
  sourceRef?: string;
  evidenceSummary?: string;
  allowedUses: ProfileFactAllowedUse[];
  blockedUses: ProfileFactAllowedUse[];
}

interface ClassifiedFactResult {
  normalizedClaim: string;
  truthStatus: ProfileFactTruthStatus;
  allowedUses: ProfileFactAllowedUse[];
  blockedUses: ProfileFactAllowedUse[];
  carefulPhrasingRequired: boolean;
  reasons: string[];
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clampConfidence(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function normalizeClaim(category: ProfileFactCategory, claim: string) {
  const normalized = claim.trim().replace(/\s+/g, " ").toLowerCase();
  if (category === "clearance" && normalized.includes("public trust")) return "public trust";
  return normalized;
}

function hasEvidence(input: Pick<ClassifiedFactInput, "sourceRef" | "evidenceSummary" | "sourceType">) {
  return Boolean(input.sourceRef || input.evidenceSummary || input.sourceType === "manual_review" || input.sourceType === "document_upload" || input.sourceType === "resume_upload");
}

function sanitizeUses(values: unknown, fallback: ProfileFactAllowedUse[]) {
  if (!Array.isArray(values)) return fallback;
  return unique(values.filter((value): value is ProfileFactAllowedUse => typeof value === "string" && allUses.includes(value as ProfileFactAllowedUse)));
}

function removeUses(allowedUses: ProfileFactAllowedUse[], blockedUses: ProfileFactAllowedUse[]) {
  return allowedUses.filter((use) => !blockedUses.includes(use));
}

export class ClaimTruthStatusWorker {
  classify(input: ClassifiedFactInput): ClassifiedFactResult {
    const reasons: string[] = [];
    const normalizedClaim = normalizeClaim(input.category, input.claim);
    let truthStatus = input.requestedTruthStatus;
    let blockedUses = unique(input.blockedUses);
    let allowedUses = unique(input.allowedUses.length > 0 ? input.allowedUses : allUses);
    let carefulPhrasingRequired = false;
    const evidencePresent = hasEvidence(input);

    if (input.category === "clearance" && normalizedClaim === "public trust") {
      reasons.push("Public Trust is tracked distinctly and is not upgraded into a security clearance.");
    }

    if (truthStatus === "verified" && !evidencePresent) {
      truthStatus = "needs_evidence";
      reasons.push("Verified claims require evidence before direct use.");
    }

    if (evidenceRequiredCategories.has(input.category) && input.requestedTruthStatus === "verified" && !evidencePresent) {
      reasons.push(`${input.category} claims require strict evidence before verified use.`);
    }

    if (input.category === "certification" && (!evidencePresent || input.sourceType === "resume_upload")) {
      if (truthStatus !== "blocked" && truthStatus !== "rejected") truthStatus = "needs_evidence";
      reasons.push("Certification claims require external evidence; resume text alone is not certification proof.");
    }

    if (evidencePresent && input.sourceType === "resume_upload" && ["education", "work_history"].includes(input.category) && truthStatus === "needs_evidence") {
      truthStatus = "user_asserted";
      blockedUses = blockedUses.filter((use) => use !== "resume" && use !== "application_packet");
      reasons.push("Resume-upload evidence supports using this as a user-asserted profile fact.");
    }

    if (input.sourceType === "system_inference" && input.category === "certification") {
      truthStatus = "needs_evidence";
      reasons.push("Certifications cannot be inferred from tool or skill usage.");
    }

    if (truthStatus === "user_asserted") {
      carefulPhrasingRequired = true;
      reasons.push("User-asserted facts require careful phrasing.");
    }

    if (truthStatus === "inferred") {
      blockedUses = unique([...blockedUses, ...formalDocumentUses]);
      reasons.push("Inferred facts require confirmation before formal document use.");
    }

    if (truthStatus === "needs_evidence") {
      blockedUses = unique([...blockedUses, "resume", "application_packet"]);
      reasons.push("Needs-evidence facts cannot be used in resumes or applications.");
    }

    if (truthStatus === "rejected") {
      blockedUses = allUses;
      reasons.push("Rejected facts cannot be used.");
    }

    if (truthStatus === "blocked") {
      blockedUses = allUses;
      reasons.push("Blocked facts cannot be used anywhere.");
    }

    allowedUses = removeUses(allowedUses, blockedUses);
    return { normalizedClaim, truthStatus, allowedUses, blockedUses, carefulPhrasingRequired, reasons };
  }
}

export class ProfileFactUpsertWorker {
  constructor(private readonly classifier = new ClaimTruthStatusWorker()) {}

  build(command: CareerCommand<ProfileFactUpsertPayload>, existing?: ProfileFact): ProfileFactUpsertResult | CommandResult {
    const payload = command.payload ?? {};
    const claim = stringFrom(payload.claim);
    const category = payload.category;
    const sourceType = payload.sourceType ?? "user_input";
    const requestedTruthStatus = payload.truthStatus ?? "user_asserted";

    if (!command.userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Profile facts require a userId." } };
    if (!claim) return { ok: false, status: "rejected", commandId: command.id, error: { code: "PROFILE_FACT_CLAIM_REQUIRED", message: "Profile fact claim is required." } };
    if (!category || !validCategories.has(category)) return { ok: false, status: "rejected", commandId: command.id, error: { code: "PROFILE_FACT_CATEGORY_REQUIRED", message: "A valid profile fact category is required." } };
    if (!validSourceTypes.has(sourceType)) return { ok: false, status: "rejected", commandId: command.id, error: { code: "PROFILE_FACT_SOURCE_TYPE_INVALID", message: "A valid sourceType is required." } };
    if (!validTruthStatuses.has(requestedTruthStatus)) return { ok: false, status: "rejected", commandId: command.id, error: { code: "PROFILE_FACT_TRUTH_STATUS_INVALID", message: "A valid truthStatus is required." } };

    const now = new Date().toISOString();
    const classified = this.classifier.classify({
      category,
      claim,
      requestedTruthStatus,
      sourceType,
      sourceRef: payload.sourceRef,
      evidenceSummary: payload.evidenceSummary,
      allowedUses: sanitizeUses(payload.allowedUses, existing?.allowedUses ?? allUses),
      blockedUses: sanitizeUses(payload.blockedUses, existing?.blockedUses ?? [])
    });

    return {
      fact: {
        id: payload.id ?? command.entityId ?? existing?.id ?? `profile_fact_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        workspaceId: payload.workspaceId ?? existing?.workspaceId ?? "default",
        userId: command.userId,
        category,
        claim,
        normalizedClaim: classified.normalizedClaim,
        truthStatus: classified.truthStatus,
        sourceType,
        sourceRef: payload.sourceRef ?? existing?.sourceRef,
        evidenceSummary: payload.evidenceSummary ?? existing?.evidenceSummary,
        confidence: clampConfidence(payload.confidence, classified.truthStatus === "verified" ? 1 : 0.7),
        allowedUses: classified.allowedUses,
        blockedUses: classified.blockedUses,
        expiresAt: payload.expiresAt ?? existing?.expiresAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      },
      carefulPhrasingRequired: classified.carefulPhrasingRequired,
      classificationReasons: classified.reasons
    };
  }
}

export class ProfileFactListWorker {
  filter(facts: ProfileFact[], payload: ProfileFactListPayload = {}) {
    return facts.filter((fact) => {
      if (payload.workspaceId && fact.workspaceId !== payload.workspaceId) return false;
      if (payload.category && fact.category !== payload.category) return false;
      if (payload.truthStatus && fact.truthStatus !== payload.truthStatus) return false;
      if (payload.allowedUse && !fact.allowedUses.includes(payload.allowedUse)) return false;
      return true;
    });
  }
}

type ProfileFactsContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProfileFact(value: unknown): value is ProfileFact {
  return isRecord(value) && typeof value.id === "string" && typeof value.claim === "string";
}

function isCommandResult(value: ProfileFactUpsertResult | CommandResult): value is CommandResult {
  return "ok" in value && "status" in value && "commandId" in value;
}

function isCareerClaim(value: unknown): value is CareerClaim {
  return isRecord(value) && typeof value.id === "string" && typeof value.claim === "string" && typeof value.category === "string";
}

async function sourceDocumentIdsForReplacement(context: ProfileFactsContext, userId: string, claims: CareerClaim[], requestedSourceDocumentId?: string) {
  const ids = new Set(claims.map((claim) => claim.sourceDocumentId));
  if (requestedSourceDocumentId) ids.add(requestedSourceDocumentId);

  const sourceProjection = await context.stateStore.getProjection("source_documents", userId, SOURCE_DOCUMENTS_CURRENT_PROJECTION, { userId });
  const documents = isRecord(sourceProjection?.data) && Array.isArray(sourceProjection.data.documents) ? sourceProjection.data.documents : [];
  for (const document of documents) {
    if (isRecord(document) && typeof document.id === "string" && (!requestedSourceDocumentId || document.id === requestedSourceDocumentId)) ids.add(document.id);
  }

  return ids;
}

function isCertificationClaimText(claim: string) {
  return /\b(?:splunk enterprise certified|security\+|cissp|network\+|aws certified|azure fundamentals|pmp|cka|ckad|certified)\b/i.test(claim);
}

function cleanCertificationClaim(claim: string) {
  return claim.replace(/^job title:\s*/i, "").replace(/^[-*•]\s*/, "").trim();
}

function profileCategoryFromClaim(category: CareerClaimCategory, claim = ""): ProfileFactCategory {
  if (category === "certification" || isCertificationClaimText(claim)) return "certification";
  if (category === "skill") return "skill";
  if (category === "tool" || category === "platform") return "tool";
  if (category === "project") return "project";
  if (category === "achievement") return "achievement";
  if (category === "education") return "education";
  if (category === "public_trust" || category === "clearance") return "clearance";
  if (category === "industry_domain") return "domain_experience";
  if (category === "work_preference") return "preference";
  return "work_history";
}

function factClaimFromCareerClaim(claim: CareerClaim) {
  if (claim.category === "public_trust") return "Public Trust";
  if (claim.category === "certification" || isCertificationClaimText(claim.claim)) return cleanCertificationClaim(claim.claim);
  if (claim.category === "job_title") return `Job title: ${claim.claim}`;
  if (claim.category === "employer") return `Employer: ${claim.claim}`;
  if (claim.category === "date") return `Work date: ${claim.claim}`;
  return claim.claim;
}

export class ProfileFactsManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "UpsertProfileFactCapability",
      workers: ["ProfileFactUpsertWorker", "ClaimTruthStatusWorker"],
      commands: [PROFILE_FACTS_UPSERT_COMMAND],
      events: [PROFILE_FACT_UPSERT_STARTED_EVENT, PROFILE_FACT_UPSERTED_EVENT, PROFILE_FACT_REJECTED_EVENT, PROFILE_FACT_BLOCKED_EVENT, PROFILE_FACT_TRUTH_STATUS_CLASSIFIED_EVENT, PROFILE_FACT_UPSERT_FAILED_EVENT],
      permissions: []
    },
    {
      name: "ListProfileFactsCapability",
      workers: ["ProfileFactListWorker"],
      commands: [PROFILE_FACTS_LIST_COMMAND],
      events: [PROFILE_FACT_LISTED_EVENT, PROFILE_FACT_LIST_FAILED_EVENT],
      permissions: []
    },
    {
      name: "ClassifyClaimTruthStatusCapability",
      workers: ["ClaimTruthStatusWorker"],
      commands: [PROFILE_FACTS_UPSERT_COMMAND],
      events: [PROFILE_FACT_TRUTH_STATUS_CLASSIFIED_EVENT],
      permissions: []
    },
    {
      name: "CreateProfileFactsFromClaimsCapability",
      workers: ["ProfileFactsFromClaimsWorker", "ProfileFactUpsertWorker", "ClaimTruthStatusWorker"],
      commands: [PROFILE_FACTS_CREATE_FROM_CLAIMS_COMMAND],
      events: [PROFILE_FACTS_CREATE_FROM_CLAIMS_STARTED_EVENT, PROFILE_FACT_CREATED_FROM_CLAIM_EVENT, PROFILE_FACTS_CREATE_FROM_CLAIMS_COMPLETED_EVENT, PROFILE_FACTS_CREATE_FROM_CLAIMS_FAILED_EVENT, PROFILE_FACT_UPSERTED_EVENT, PROFILE_FACT_TRUTH_STATUS_CLASSIFIED_EVENT],
      permissions: []
    }
  ];

  constructor(private readonly upsertWorker = new ProfileFactUpsertWorker(), private readonly listWorker = new ProfileFactListWorker()) {}

  canHandle(command: CareerCommand) {
    return command.type === PROFILE_FACTS_UPSERT_COMMAND || command.type === PROFILE_FACTS_LIST_COMMAND || command.type === PROFILE_FACTS_CREATE_FROM_CLAIMS_COMMAND;
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    if (command.type === PROFILE_FACTS_UPSERT_COMMAND) return this.handleUpsert(command as CareerCommand<ProfileFactUpsertPayload>, context as ProfileFactsContext);
    if (command.type === PROFILE_FACTS_LIST_COMMAND) return this.handleList(command as CareerCommand<ProfileFactListPayload>, context as ProfileFactsContext);
    if (command.type === PROFILE_FACTS_CREATE_FROM_CLAIMS_COMMAND) return this.handleCreateFromClaims(command as CareerCommand<ProfileFactsCreateFromClaimsPayload>, context as ProfileFactsContext);
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleUpsert(command: CareerCommand<ProfileFactUpsertPayload>, context: ProfileFactsContext): Promise<CommandResult<ProfileFactUpsertResult>> {
    const entityId = command.entityId ?? command.payload?.id ?? `profile_fact_${Date.now()}`;
    try {
      await context.eventStore.append({ eventType: PROFILE_FACT_UPSERT_STARTED_EVENT, entityType: "profile_fact", entityId, domain: this.domainSlug, manager: definition.manager, capability: "UpsertProfileFactCapability", worker: "ProfileFactUpsertWorker", userId: command.userId, payload: { commandId: command.id, category: command.payload?.category }, confidence: 1 });
      const existingProjection = await context.stateStore.getProjection("profile_fact", entityId, PROFILE_FACTS_CURRENT_PROJECTION, command.userId ? { userId: command.userId } : undefined);
      const built = this.upsertWorker.build(command, isProfileFact(existingProjection?.data) ? existingProjection.data : undefined);
      if (isCommandResult(built)) {
        await context.eventStore.append({ eventType: PROFILE_FACT_UPSERT_FAILED_EVENT, entityType: "profile_fact", entityId, domain: this.domainSlug, manager: definition.manager, capability: "UpsertProfileFactCapability", worker: "ProfileFactUpsertWorker", userId: command.userId, payload: { commandId: command.id, error: built.error }, confidence: 1 });
        return built as CommandResult<ProfileFactUpsertResult>;
      }

      await context.eventStore.append({ eventType: PROFILE_FACT_TRUTH_STATUS_CLASSIFIED_EVENT, entityType: "profile_fact", entityId: built.fact.id, domain: this.domainSlug, manager: definition.manager, capability: "ClassifyClaimTruthStatusCapability", worker: "ClaimTruthStatusWorker", userId: command.userId, payload: { commandId: command.id, truthStatus: built.fact.truthStatus, reasons: built.classificationReasons }, confidence: built.fact.confidence });
      const eventType = built.fact.truthStatus === "blocked" ? PROFILE_FACT_BLOCKED_EVENT : built.fact.truthStatus === "rejected" ? PROFILE_FACT_REJECTED_EVENT : PROFILE_FACT_UPSERTED_EVENT;
      const savedEvent = await context.eventStore.append({ eventType, entityType: "profile_fact", entityId: built.fact.id, domain: this.domainSlug, manager: definition.manager, capability: "UpsertProfileFactCapability", worker: "ProfileFactUpsertWorker", userId: command.userId, payload: built, evidence: { sourceType: built.fact.sourceType, sourceRef: built.fact.sourceRef, evidenceSummary: built.fact.evidenceSummary }, confidence: built.fact.confidence });
      await context.stateStore.upsertProjection({ userId: command.userId, projectionType: PROFILE_FACTS_CURRENT_PROJECTION, entityType: "profile_fact", entityId: built.fact.id, sourceEventId: savedEvent.id, data: built.fact, updatedAt: new Date(built.fact.updatedAt) });
      return { ok: true, status: "completed", commandId: command.id, data: built, emittedEvents: [PROFILE_FACT_UPSERT_STARTED_EVENT, PROFILE_FACT_TRUTH_STATUS_CLASSIFIED_EVENT, eventType], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown profile fact upsert failure";
      await context.eventStore.append({ eventType: PROFILE_FACT_UPSERT_FAILED_EVENT, entityType: "profile_fact", entityId, domain: this.domainSlug, manager: definition.manager, capability: "UpsertProfileFactCapability", worker: "ProfileFactUpsertWorker", userId: command.userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "PROFILE_FACT_UPSERT_FAILED", message } };
    }
  }

  private async handleList(command: CareerCommand<ProfileFactListPayload>, context: ProfileFactsContext): Promise<CommandResult<ProfileFactListResult>> {
    const entityId = command.entityId ?? command.userId ?? "profile_facts";
    try {
      const projections = await context.stateStore.listByProjectionType(PROFILE_FACTS_CURRENT_PROJECTION, command.userId ? { userId: command.userId } : undefined);
      const facts = this.listWorker.filter(projections.map((projection) => projection.data).filter(isProfileFact), command.payload ?? {});
      const result = { facts, total: facts.length };
      await context.eventStore.append({ eventType: PROFILE_FACT_LISTED_EVENT, entityType: "profile_facts", entityId, domain: this.domainSlug, manager: definition.manager, capability: "ListProfileFactsCapability", worker: "ProfileFactListWorker", userId: command.userId, payload: { commandId: command.id, total: facts.length }, confidence: 1 });
      return { ok: true, status: "completed", commandId: command.id, data: result, emittedEvents: [PROFILE_FACT_LISTED_EVENT], updatedProjections: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown profile fact list failure";
      await context.eventStore.append({ eventType: PROFILE_FACT_LIST_FAILED_EVENT, entityType: "profile_facts", entityId, domain: this.domainSlug, manager: definition.manager, capability: "ListProfileFactsCapability", worker: "ProfileFactListWorker", userId: command.userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "PROFILE_FACT_LIST_FAILED", message } };
    }
  }

  private async handleCreateFromClaims(command: CareerCommand<ProfileFactsCreateFromClaimsPayload>, context: ProfileFactsContext): Promise<CommandResult<ProfileFactsCreateFromClaimsResult>> {
    const entityId = command.entityId ?? command.userId ?? "profile_facts";
    try {
      if (!command.userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Creating profile facts from claims requires a userId." } };
      await context.eventStore.append({ eventType: PROFILE_FACTS_CREATE_FROM_CLAIMS_STARTED_EVENT, entityType: "profile_facts", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CreateProfileFactsFromClaimsCapability", worker: "ProfileFactsFromClaimsWorker", userId: command.userId, payload: { commandId: command.id, sourceDocumentId: command.payload?.sourceDocumentId }, confidence: 1 });
      const claimProjections = await context.stateStore.listByProjectionType(CAREER_CLAIM_CURRENT_PROJECTION, { userId: command.userId });
      const claims = claimProjections
        .map((projection) => projection.data)
        .filter(isCareerClaim)
        .filter((claim) => !command.payload?.sourceDocumentId || claim.sourceDocumentId === command.payload.sourceDocumentId);
      const facts: ProfileFact[] = [];
      const emittedEvents = [PROFILE_FACTS_CREATE_FROM_CLAIMS_STARTED_EVENT];
      const sourceDocumentIds = await sourceDocumentIdsForReplacement(context, command.userId, claims, command.payload?.sourceDocumentId);
      const staleFactProjections = await context.stateStore.listByProjectionType(PROFILE_FACTS_CURRENT_PROJECTION, { userId: command.userId });
      for (const projection of staleFactProjections) {
        const fact = projection.data;
        if (!isProfileFact(fact)) continue;
        const sourceRef = fact.sourceRef ?? "";
        if (sourceDocumentIds.size > 0 && [...sourceDocumentIds].some((sourceDocumentId) => sourceRef.startsWith(`source_document:${sourceDocumentId}:`))) {
          await context.stateStore.deleteProjection(projection.id);
        }
      }

      for (const claim of claims) {
        const factId = `profile_fact_from_${claim.id}`;
        const result = await this.handleUpsert({
          ...command,
          id: `${command.id}_${claim.id}`,
          type: PROFILE_FACTS_UPSERT_COMMAND,
          entityType: "profile_fact",
          entityId: factId,
          payload: {
            id: factId,
            workspaceId: claim.workspaceId,
            category: profileCategoryFromClaim(claim.category, claim.claim),
            claim: factClaimFromCareerClaim(claim),
            truthStatus: claim.suggestedTruthStatus,
            sourceType: "resume_upload",
            sourceRef: `source_document:${claim.sourceDocumentId}:claim:${claim.id}`,
            evidenceSummary: claim.evidenceText,
            confidence: Math.min(claim.confidence, 0.85),
            allowedUses: claim.suggestedAllowedUses,
            blockedUses: claim.suggestedBlockedUses
          }
        }, context);
        if (result.ok && result.data) {
          facts.push(result.data.fact);
          const event = await context.eventStore.append({ eventType: PROFILE_FACT_CREATED_FROM_CLAIM_EVENT, entityType: "profile_fact", entityId: result.data.fact.id, domain: this.domainSlug, manager: definition.manager, capability: "CreateProfileFactsFromClaimsCapability", worker: "ProfileFactsFromClaimsWorker", userId: command.userId, payload: { commandId: command.id, sourceClaimId: claim.id, factId: result.data.fact.id, truthStatus: result.data.fact.truthStatus }, evidence: { sourceDocumentId: claim.sourceDocumentId, sourceClaimId: claim.id }, confidence: result.data.fact.confidence });
          emittedEvents.push(...(result.emittedEvents ?? []), PROFILE_FACT_CREATED_FROM_CLAIM_EVENT);
          await context.stateStore.upsertProjection({ userId: command.userId, projectionType: PROFILE_FACTS_CURRENT_PROJECTION, entityType: "profile_fact", entityId: result.data.fact.id, sourceEventId: event.id, data: result.data.fact, updatedAt: new Date(result.data.fact.updatedAt) });
        }
      }

      await context.eventStore.append({ eventType: PROFILE_FACTS_CREATE_FROM_CLAIMS_COMPLETED_EVENT, entityType: "profile_facts", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CreateProfileFactsFromClaimsCapability", worker: "ProfileFactsFromClaimsWorker", userId: command.userId, payload: { commandId: command.id, total: facts.length, sourceClaimCount: claims.length }, confidence: 1 });
      emittedEvents.push(PROFILE_FACTS_CREATE_FROM_CLAIMS_COMPLETED_EVENT);
      return { ok: true, status: "completed", commandId: command.id, data: { facts, total: facts.length, sourceClaimCount: claims.length }, emittedEvents: unique(emittedEvents), updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown profile facts from claims failure";
      await context.eventStore.append({ eventType: PROFILE_FACTS_CREATE_FROM_CLAIMS_FAILED_EVENT, entityType: "profile_facts", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CreateProfileFactsFromClaimsCapability", worker: "ProfileFactsFromClaimsWorker", userId: command.userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "PROFILE_FACTS_CREATE_FROM_CLAIMS_FAILED", message }, emittedEvents: [PROFILE_FACTS_CREATE_FROM_CLAIMS_FAILED_EVENT], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION] };
    }
  }
}

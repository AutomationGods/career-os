import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { profileFactsCapability } from "./capabilities";
import { prismaMasterResumeStore, type MasterResumeStore, type ParsedMasterResumeFact } from "./master-resume-service";
import {
  INITIAL_BLOCKED_PROFILE_FACTS,
  prismaProfileFactsStore,
  profileFactResumeText,
  selectBlockedClaimLabels,
  selectResumeAllowedProfileFacts,
  type ProfileFactInput,
  type ProfileFactRecord,
  type ProfileFactsStore,
  type ProfileFactUpdateInput
} from "./profile-facts-service";

export const PROFILE_FACT_COMMANDS = [
  "profile_facts.create",
  "profile_facts.update",
  "profile_facts.archive",
  "profile_facts.verify",
  "profile_facts.block",
  "profile_facts.list",
  "profile_facts.seed_initial",
  "master_resume.import",
  "master_resume.get"
];

export const PROFILE_FACT_EVENTS = [
  "profile_fact.created",
  "profile_fact.updated",
  "profile_fact.verified",
  "profile_fact.blocked",
  "profile_fact.archived",
  "profile_facts.seeded",
  "master_resume.imported",
  "master_resume.parsed",
  "profile_fact.candidate_created",
  "profile_facts.review_queue_updated"
];

export const PROFILE_FACTS_CURRENT_PROJECTION = "profile_facts.current";
export const PROFILE_FACTS_RESUME_ALLOWED_PROJECTION = "profile_facts.resume_allowed";
export const PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION = "profile_facts.blocked_claims";
export const PROFILE_FACTS_REVIEW_QUEUE_PROJECTION = "profile_facts.review_queue";
export const MASTER_RESUME_CURRENT_PROJECTION = "master_resume.current";
export const MASTER_RESUME_SOURCE_SNAPSHOT = "master_resume.source_text";

export const definition: DomainDefinition = {
  name: "Identity Domain",
  slug: "identity",
  manager: "Identity Manager",
  capabilities: ["ProfileFactsCapability"],
  workers: ["ProfileFactsWorker"],
  tools: ["ProfileFactsTool"],
  commands: PROFILE_FACT_COMMANDS,
  events: PROFILE_FACT_EVENTS,
  permissions: ["modify_master_profile"],
  dependencies: ["event-store", "state-store", "snapshot-store", "resume-factory", "user-crm", "document-intelligence"],
  status: "implemented",
  version: "1.0.0"
};

type IdentityContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
  profileFactsStore?: ProfileFactsStore;
  masterResumeStore?: MasterResumeStore;
};

type ProfileFactsPayload = Partial<ProfileFactInput & ProfileFactUpdateInput> & {
  id?: string;
  userId?: string;
  status?: string;
  filter?: "all" | "verified" | "needs_review" | "blocked" | "resume_allowed";
  resumeText?: string;
  source?: string;
};

function isPayload(value: unknown): value is ProfileFactsPayload {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringFrom(value: unknown) {
  const text = stringFrom(value);
  return text || undefined;
}

function booleanFrom(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function numberFrom(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function dateFrom(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validationError(command: CareerCommand, code: string, message: string): CommandResult {
  return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
}

function factEventPayload(fact: ProfileFactRecord) {
  return {
    userId: fact.userId,
    profileFactId: fact.id,
    factType: fact.factType,
    label: fact.label,
    verificationStatus: fact.verificationStatus,
    allowedInResume: fact.allowedInResume,
    sourceType: fact.sourceType,
    isBlocked: fact.isBlocked,
    blockedReason: fact.blockedReason
  };
}

function normalizedClaimText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ").replace(/\s+/g, " ").trim();
}

function candidateKey(candidate: Pick<ParsedMasterResumeFact | ProfileFactRecord, "factType" | "label">) {
  return `${candidate.factType}:${normalizedClaimText(candidate.label)}`;
}

function summarizeFacts(userId: string, facts: ProfileFactRecord[]) {
  const resumeAllowedFacts = selectResumeAllowedProfileFacts(facts);
  const blockedFacts = facts.filter((fact) => fact.isBlocked || fact.verificationStatus === "blocked");
  const needsReview = facts.filter((fact) => fact.requiresReview || fact.verificationStatus === "needs_review");
  return {
    userId,
    verifiedFacts: facts.filter((fact) => fact.verificationStatus === "verified").length,
    verifiedResumeFacts: resumeAllowedFacts.length,
    blockedClaims: blockedFacts.length,
    needsReview: needsReview.length,
    resumeAllowedFacts: resumeAllowedFacts.length,
    totalFacts: facts.length,
    lastUpdatedAt: new Date().toISOString()
  };
}

function buildCreateInput(payload: ProfileFactsPayload): ProfileFactInput {
  return {
    userId: stringFrom(payload.userId),
    factType: stringFrom(payload.factType),
    category: optionalStringFrom(payload.category),
    label: stringFrom(payload.label),
    value: optionalStringFrom(payload.value),
    description: optionalStringFrom(payload.description),
    source: optionalStringFrom(payload.source),
    sourceType: optionalStringFrom(payload.sourceType) ?? "manual",
    confidence: numberFrom(payload.confidence),
    verificationStatus: optionalStringFrom(payload.verificationStatus),
    allowedInResume: booleanFrom(payload.allowedInResume),
    allowedInCoverLetter: booleanFrom(payload.allowedInCoverLetter),
    allowedInRecruiterMessage: booleanFrom(payload.allowedInRecruiterMessage),
    requiresReview: booleanFrom(payload.requiresReview),
    isBlocked: booleanFrom(payload.isBlocked),
    blockedReason: optionalStringFrom(payload.blockedReason),
    expiresAt: dateFrom(payload.expiresAt)
  };
}

function buildUpdateInput(payload: ProfileFactsPayload): ProfileFactUpdateInput {
  return {
    id: stringFrom(payload.id),
    userId: optionalStringFrom(payload.userId),
    factType: optionalStringFrom(payload.factType),
    category: optionalStringFrom(payload.category),
    label: optionalStringFrom(payload.label),
    value: optionalStringFrom(payload.value),
    description: optionalStringFrom(payload.description),
    source: optionalStringFrom(payload.source),
    sourceType: optionalStringFrom(payload.sourceType),
    confidence: numberFrom(payload.confidence),
    verificationStatus: optionalStringFrom(payload.verificationStatus),
    allowedInResume: booleanFrom(payload.allowedInResume),
    allowedInCoverLetter: booleanFrom(payload.allowedInCoverLetter),
    allowedInRecruiterMessage: booleanFrom(payload.allowedInRecruiterMessage),
    requiresReview: booleanFrom(payload.requiresReview),
    isBlocked: booleanFrom(payload.isBlocked),
    blockedReason: optionalStringFrom(payload.blockedReason),
    expiresAt: dateFrom(payload.expiresAt)
  };
}

async function updateProfileFactProjections(context: IdentityContext, userId: string, sourceEventId?: string) {
  const store = context.profileFactsStore ?? prismaProfileFactsStore;
  const facts = await store.list({ userId, filter: "all" });
  const resumeAllowed = selectResumeAllowedProfileFacts(facts);
  const blockedClaims = facts.filter((fact) => fact.isBlocked || fact.verificationStatus === "blocked");
  const needsReview = facts.filter((fact) => fact.requiresReview || fact.verificationStatus === "needs_review");
  const summary = summarizeFacts(userId, facts);

  await context.stateStore.upsertProjection({
    userId,
    projectionType: PROFILE_FACTS_CURRENT_PROJECTION,
    entityType: "user",
    entityId: userId,
    sourceEventId,
    data: { ...summary, facts },
    updatedAt: new Date()
  });

  await context.stateStore.upsertProjection({
    userId,
    projectionType: PROFILE_FACTS_RESUME_ALLOWED_PROJECTION,
    entityType: "user",
    entityId: userId,
    sourceEventId,
    data: { userId, facts: resumeAllowed, verifiedFacts: resumeAllowed.map(profileFactResumeText), count: resumeAllowed.length, updatedAt: new Date().toISOString() },
    updatedAt: new Date()
  });

  await context.stateStore.upsertProjection({
    userId,
    projectionType: PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION,
    entityType: "user",
    entityId: userId,
    sourceEventId,
    data: { userId, facts: blockedClaims, blockedClaims: selectBlockedClaimLabels(facts), count: blockedClaims.length, updatedAt: new Date().toISOString() },
    updatedAt: new Date()
  });

  await context.stateStore.upsertProjection({
    userId,
    projectionType: PROFILE_FACTS_REVIEW_QUEUE_PROJECTION,
    entityType: "user",
    entityId: userId,
    sourceEventId,
    data: { userId, facts: needsReview, count: needsReview.length, updatedAt: new Date().toISOString() },
    updatedAt: new Date()
  });
}

async function ensureBlockedSafetyClaims(context: IdentityContext, userId: string) {
  const store = context.profileFactsStore ?? prismaProfileFactsStore;
  const existingFacts = await store.list({ userId, filter: "all" });
  const existingKeys = new Set(existingFacts.map(candidateKey));
  const ensuredFacts: ProfileFactRecord[] = [];

  for (const seed of INITIAL_BLOCKED_PROFILE_FACTS) {
    const key = candidateKey({ factType: seed.factType, label: seed.label });
    if (existingKeys.has(key)) continue;
    const blocked = await store.block({ userId, factType: seed.factType, label: seed.label, blockedReason: seed.blockedReason ?? "Blocked safety claim." });
    if (blocked) ensuredFacts.push(blocked);
  }

  return ensuredFacts;
}

async function createCandidateFacts(context: IdentityContext, userId: string, candidates: ParsedMasterResumeFact[], source: string) {
  const store = context.profileFactsStore ?? prismaProfileFactsStore;
  const existingFacts = await store.list({ userId, filter: "all" });
  const existingKeys = new Set(existingFacts.map(candidateKey));
  const blockedLabels = new Set(selectBlockedClaimLabels(existingFacts).map(normalizedClaimText));
  const createdFacts: ProfileFactRecord[] = [];
  const skippedCandidates: Array<{ label: string; factType: string; reason: string }> = [];

  for (const candidate of candidates) {
    const key = candidateKey(candidate);
    const blockedByLabel = blockedLabels.has(normalizedClaimText(candidate.label));
    if (existingKeys.has(key) || blockedByLabel) {
      skippedCandidates.push({ label: candidate.label, factType: candidate.factType, reason: blockedByLabel ? "blocked_claim" : "existing_fact" });
      continue;
    }

    const fact = await store.create({
      userId,
      factType: candidate.factType,
      category: candidate.category,
      label: candidate.label,
      value: candidate.value,
      description: candidate.description,
      source,
      sourceType: "resume_import",
      confidence: candidate.confidence,
      verificationStatus: "needs_review",
      allowedInResume: false,
      allowedInCoverLetter: false,
      allowedInRecruiterMessage: false,
      requiresReview: true,
      isBlocked: false
    });
    createdFacts.push(fact);
    existingKeys.add(key);
  }

  return { createdFacts, skippedCandidates };
}

export class IdentityManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [profileFactsCapability];

  canHandle(command: CareerCommand) {
    return PROFILE_FACT_COMMANDS.includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    if (!isPayload(command.payload)) return validationError(command, "PROFILE_FACTS_PAYLOAD_REQUIRED", "Profile Facts commands require an object payload.");
    const executionContext = context as IdentityContext;
    const store = executionContext.profileFactsStore ?? prismaProfileFactsStore;
    const masterResumeStore = executionContext.masterResumeStore ?? prismaMasterResumeStore;
    const payload = command.payload;

    if (command.type === "master_resume.get") {
      const userId = stringFrom(payload.userId ?? command.entityId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to get a master resume.");
      const masterResume = await masterResumeStore.getCurrent(userId);
      const reviewQueue = await store.list({ userId, filter: "needs_review" });
      return { ok: true, status: "completed", commandId: command.id, data: { masterResume, reviewQueue, summary: summarizeFacts(userId, await store.list({ userId, filter: "all" })) } };
    }

    if (command.type === "master_resume.import") {
      const userId = stringFrom(payload.userId ?? command.entityId);
      const resumeText = stringFrom(payload.resumeText);
      const source = optionalStringFrom(payload.source) ?? "pasted_plain_text";
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to import a master resume.");
      if (!resumeText) return validationError(command, "MASTER_RESUME_TEXT_REQUIRED", "resumeText is required to import a master resume.");

      const masterResume = await masterResumeStore.importResume({ userId, resumeText, source });
      const sourceSnapshot = await executionContext.snapshotStore.captureSnapshot({
        userId,
        entityType: "master_resume",
        entityId: masterResume.id,
        snapshotType: MASTER_RESUME_SOURCE_SNAPSHOT,
        source: MASTER_RESUME_SOURCE_SNAPSHOT,
        data: { userId, masterResumeId: masterResume.id, source, rawText: masterResume.content.rawText, importedAt: masterResume.content.importedAt }
      });

      const importedEvent = await executionContext.eventStore.append({
        eventType: "master_resume.imported",
        entityType: "master_resume",
        entityId: masterResume.id,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ProfileFactsCapability",
        worker: "ProfileFactsWorker",
        userId: command.userId,
        payload: { userId, masterResumeId: masterResume.id, source, rawTextLength: masterResume.content.stats.rawTextLength, sourceSnapshotId: sourceSnapshot.id },
        evidence: { sourceSnapshotId: sourceSnapshot.id, parseVersion: masterResume.content.parseVersion },
        confidence: 1
      });

      const ensuredBlockedFacts = await ensureBlockedSafetyClaims(executionContext, userId);
      for (const fact of ensuredBlockedFacts) {
        await executionContext.eventStore.append({
          eventType: "profile_fact.blocked",
          entityType: "profile_fact",
          entityId: fact.id,
          domain: definition.slug,
          manager: definition.manager,
          capability: "ProfileFactsCapability",
          worker: "ProfileFactsWorker",
          userId: command.userId,
          payload: { ...factEventPayload(fact), masterResumeId: masterResume.id, sourceSnapshotId: sourceSnapshot.id, safetySeededBy: "master_resume.import" },
          evidence: { sourceSnapshotId: sourceSnapshot.id, candidateSource: "master_resume.import" },
          confidence: 1
        });
      }

      const { createdFacts, skippedCandidates } = await createCandidateFacts(executionContext, userId, masterResume.content.candidateFacts, `Master Resume import ${masterResume.id}`);
      for (const fact of createdFacts) {
        await executionContext.eventStore.append({
          eventType: "profile_fact.candidate_created",
          entityType: "profile_fact",
          entityId: fact.id,
          domain: definition.slug,
          manager: definition.manager,
          capability: "ProfileFactsCapability",
          worker: "ProfileFactsWorker",
          userId: command.userId,
          payload: { ...factEventPayload(fact), masterResumeId: masterResume.id, sourceSnapshotId: sourceSnapshot.id },
          evidence: { sourceSnapshotId: sourceSnapshot.id, candidateSource: "master_resume.import" },
          confidence: fact.confidence
        });
      }

      const parsedEvent = await executionContext.eventStore.append({
        eventType: "master_resume.parsed",
        entityType: "master_resume",
        entityId: masterResume.id,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ProfileFactsCapability",
        worker: "ProfileFactsWorker",
        userId: command.userId,
        payload: {
          userId,
          masterResumeId: masterResume.id,
          candidateFactCount: masterResume.content.candidateFacts.length,
          createdCandidateFactIds: createdFacts.map((fact) => fact.id),
          skippedCandidates,
          ensuredBlockedClaimIds: ensuredBlockedFacts.map((fact) => fact.id)
        },
        evidence: { sourceSnapshotId: sourceSnapshot.id, importedEventId: importedEvent.id, parser: masterResume.content.parseVersion },
        confidence: 1
      });

      await executionContext.stateStore.upsertProjection({
        userId,
        projectionType: MASTER_RESUME_CURRENT_PROJECTION,
        entityType: "user",
        entityId: userId,
        sourceEventId: parsedEvent.id,
        data: { userId, masterResume, sourceSnapshotId: sourceSnapshot.id, candidateFacts: masterResume.content.candidateFacts, createdCandidateFacts: createdFacts, skippedCandidates, ensuredBlockedClaims: ensuredBlockedFacts, updatedAt: new Date().toISOString() },
        updatedAt: new Date()
      });

      await updateProfileFactProjections(executionContext, userId, parsedEvent.id);
      const reviewQueue = await store.list({ userId, filter: "needs_review" });
      await executionContext.eventStore.append({
        eventType: "profile_facts.review_queue_updated",
        entityType: "user",
        entityId: userId,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ProfileFactsCapability",
        worker: "ProfileFactsWorker",
        userId: command.userId,
        payload: { userId, count: reviewQueue.length, sourceEventId: parsedEvent.id },
        confidence: 1
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: { masterResume, candidateFacts: createdFacts, skippedCandidates, ensuredBlockedClaims: ensuredBlockedFacts, reviewQueue, sourceSnapshotId: sourceSnapshot.id },
        emittedEvents: ["master_resume.imported", "profile_fact.blocked", "profile_fact.candidate_created", "master_resume.parsed", "profile_facts.review_queue_updated"],
        updatedProjections: [MASTER_RESUME_CURRENT_PROJECTION, PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION, PROFILE_FACTS_REVIEW_QUEUE_PROJECTION]
      };
    }

    if (command.type === "profile_facts.list") {
      const userId = stringFrom(payload.userId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to list profile facts.");
      const facts = await store.list({ userId, status: optionalStringFrom(payload.status), filter: payload.filter ?? "all" });
      return { ok: true, status: "completed", commandId: command.id, data: { facts, summary: summarizeFacts(userId, await store.list({ userId, filter: "all" })) } };
    }

    if (command.type === "profile_facts.seed_initial") {
      const userId = stringFrom(payload.userId);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to seed profile facts.");
      const seeded = await store.seedInitial(userId);
      const event = await executionContext.eventStore.append({
        eventType: "profile_facts.seeded",
        entityType: "user",
        entityId: userId,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ProfileFactsCapability",
        worker: "ProfileFactsWorker",
        payload: { userId, createdCount: seeded.createdCount, skippedCount: seeded.skippedCount, facts: seeded.facts.map(factEventPayload) },
        confidence: 1
      });
      await updateProfileFactProjections(executionContext, userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: seeded, emittedEvents: ["profile_facts.seeded"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION, PROFILE_FACTS_REVIEW_QUEUE_PROJECTION] };
    }

    if (command.type === "profile_facts.create") {
      const input = buildCreateInput(payload);
      if (!input.userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to create a profile fact.");
      if (!input.factType) return validationError(command, "FACT_TYPE_REQUIRED", "factType is required to create a profile fact.");
      if (!input.label) return validationError(command, "LABEL_REQUIRED", "label is required to create a profile fact.");
      const fact = await store.create(input);
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.created", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.created"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION, PROFILE_FACTS_REVIEW_QUEUE_PROJECTION] };
    }

    if (command.type === "profile_facts.update") {
      const input = buildUpdateInput(payload);
      if (!input.id) return validationError(command, "PROFILE_FACT_ID_REQUIRED", "id is required to update a profile fact.");
      const fact = await store.update(input);
      if (!fact) return validationError(command, "PROFILE_FACT_NOT_FOUND", "Profile fact not found.");
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.updated", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.updated"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION, PROFILE_FACTS_REVIEW_QUEUE_PROJECTION] };
    }

    if (command.type === "profile_facts.verify") {
      const id = stringFrom(payload.id ?? command.entityId);
      const userId = stringFrom(payload.userId ?? command.userId);
      if (!id) return validationError(command, "PROFILE_FACT_ID_REQUIRED", "id is required to verify a profile fact.");
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to verify a profile fact.");
      const fact = await store.verify(id, userId);
      if (!fact) return validationError(command, "PROFILE_FACT_NOT_FOUND", "Profile fact not found.");
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.verified", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.verified"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION, PROFILE_FACTS_REVIEW_QUEUE_PROJECTION] };
    }

    if (command.type === "profile_facts.block") {
      const userId = stringFrom(payload.userId);
      const blockedReason = stringFrom(payload.blockedReason);
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to block a profile fact.");
      if (!blockedReason) return validationError(command, "BLOCKED_REASON_REQUIRED", "blockedReason is required to block a profile fact.");
      const fact = await store.block({ userId, id: optionalStringFrom(payload.id ?? command.entityId), label: optionalStringFrom(payload.label), factType: optionalStringFrom(payload.factType), blockedReason });
      if (!fact) return validationError(command, "PROFILE_FACT_BLOCK_TARGET_REQUIRED", "id or label is required to block a profile fact.");
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.blocked", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.blocked"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION, PROFILE_FACTS_REVIEW_QUEUE_PROJECTION] };
    }

    if (command.type === "profile_facts.archive") {
      const id = stringFrom(payload.id ?? command.entityId);
      const userId = stringFrom(payload.userId ?? command.userId);
      if (!id) return validationError(command, "PROFILE_FACT_ID_REQUIRED", "id is required to archive a profile fact.");
      if (!userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to archive a profile fact.");
      const fact = await store.archive(id, userId);
      if (!fact) return validationError(command, "PROFILE_FACT_NOT_FOUND", "Profile fact not found.");
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.archived", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.archived"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION, PROFILE_FACTS_REVIEW_QUEUE_PROJECTION] };
    }

    return validationError(command, "PROFILE_FACT_COMMAND_UNSUPPORTED", `Unsupported Profile Facts command: ${command.type}`);
  }
}

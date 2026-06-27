import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { profileFactsCapability } from "./capabilities";
import {
  prismaProfileFactsStore,
  profileFactResumeText,
  selectBlockedClaimLabels,
  selectResumeAllowedFacts,
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
  "profile_facts.seed_initial"
];

export const PROFILE_FACT_EVENTS = [
  "profile_fact.created",
  "profile_fact.updated",
  "profile_fact.verified",
  "profile_fact.blocked",
  "profile_fact.archived",
  "profile_facts.seeded"
];

export const PROFILE_FACTS_CURRENT_PROJECTION = "profile_facts.current";
export const PROFILE_FACTS_RESUME_ALLOWED_PROJECTION = "profile_facts.resume_allowed";
export const PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION = "profile_facts.blocked_claims";

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
};

type ProfileFactsPayload = Partial<ProfileFactInput & ProfileFactUpdateInput> & {
  id?: string;
  userId?: string;
  status?: string;
  filter?: "all" | "verified" | "needs_review" | "blocked" | "resume_allowed";
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

function summarizeFacts(userId: string, facts: ProfileFactRecord[]) {
  const resumeAllowedFacts = selectResumeAllowedProfileFacts(facts);
  const blockedFacts = facts.filter((fact) => fact.isBlocked || fact.verificationStatus === "blocked");
  const needsReview = facts.filter((fact) => fact.requiresReview || fact.verificationStatus === "needs_review");
  return {
    userId,
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
    const payload = command.payload;

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
      return { ok: true, status: "completed", commandId: command.id, data: seeded, emittedEvents: ["profile_facts.seeded"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION] };
    }

    if (command.type === "profile_facts.create") {
      const input = buildCreateInput(payload);
      if (!input.userId) return validationError(command, "USER_ID_REQUIRED", "userId is required to create a profile fact.");
      if (!input.factType) return validationError(command, "FACT_TYPE_REQUIRED", "factType is required to create a profile fact.");
      if (!input.label) return validationError(command, "LABEL_REQUIRED", "label is required to create a profile fact.");
      const fact = await store.create(input);
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.created", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.created"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION] };
    }

    if (command.type === "profile_facts.update") {
      const input = buildUpdateInput(payload);
      if (!input.id) return validationError(command, "PROFILE_FACT_ID_REQUIRED", "id is required to update a profile fact.");
      const fact = await store.update(input);
      if (!fact) return validationError(command, "PROFILE_FACT_NOT_FOUND", "Profile fact not found.");
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.updated", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.updated"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION] };
    }

    if (command.type === "profile_facts.verify") {
      const id = stringFrom(payload.id ?? command.entityId);
      if (!id) return validationError(command, "PROFILE_FACT_ID_REQUIRED", "id is required to verify a profile fact.");
      const fact = await store.verify(id);
      if (!fact) return validationError(command, "PROFILE_FACT_NOT_FOUND", "Profile fact not found.");
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.verified", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.verified"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION] };
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
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.blocked"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION] };
    }

    if (command.type === "profile_facts.archive") {
      const id = stringFrom(payload.id ?? command.entityId);
      if (!id) return validationError(command, "PROFILE_FACT_ID_REQUIRED", "id is required to archive a profile fact.");
      const fact = await store.archive(id);
      if (!fact) return validationError(command, "PROFILE_FACT_NOT_FOUND", "Profile fact not found.");
      const event = await executionContext.eventStore.append({ eventType: "profile_fact.archived", entityType: "profile_fact", entityId: fact.id, domain: definition.slug, manager: definition.manager, capability: "ProfileFactsCapability", worker: "ProfileFactsWorker", payload: factEventPayload(fact), confidence: fact.confidence });
      await updateProfileFactProjections(executionContext, fact.userId, event.id);
      return { ok: true, status: "completed", commandId: command.id, data: { fact }, emittedEvents: ["profile_fact.archived"], updatedProjections: [PROFILE_FACTS_CURRENT_PROJECTION, PROFILE_FACTS_RESUME_ALLOWED_PROJECTION, PROFILE_FACTS_BLOCKED_CLAIMS_PROJECTION] };
    }

    return validationError(command, "PROFILE_FACT_COMMAND_UNSUPPORTED", `Unsupported Profile Facts command: ${command.type}`);
  }
}

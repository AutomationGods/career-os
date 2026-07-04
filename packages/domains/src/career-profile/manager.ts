import type { EventStore } from "@career-os/events";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import type { ProfileFact } from "../profile-facts/manager";
import { normalizeCareerTargets, type TargetNormalizationResult } from "./role-taxonomy";

export const CAREER_PROFILE_GENERATE_COMMAND = "career_profile.generate";
export const CAREER_PROFILE_GET_COMMAND = "career_profile.get";
export const CAREER_PROFILE_CURRENT_PROJECTION = "career_profile.current";

export const CAREER_PROFILE_GENERATION_STARTED_EVENT = "career_profile.generation_started";
export const CAREER_PROFILE_GENERATED_EVENT = "career_profile.generated";
export const CAREER_PROFILE_GENERATION_FAILED_EVENT = "career_profile.generation_failed";
export const CAREER_PROFILE_LOADED_EVENT = "career_profile.loaded";

export interface CareerProfile {
  id: string;
  workspaceId: string;
  userId: string;
  targetTitles: string[];
  strongestSkills: string[];
  strongestTools: string[];
  strongestDomains: string[];
  strongestAchievements: string[];
  suggestedResumeVariants: string[];
  suggestedJobSearchKeywords: string[];
  fastestRoleTargets: string[];
  searchDiagnostics: TargetNormalizationResult;
  missingEvidence: string[];
  claimsToAvoid: string[];
  resumeSafeFacts: ProfileFact[];
  interviewSafeFacts: ProfileFact[];
  recruiterEmailSafeFacts: ProfileFact[];
  applicationPacketSafeFacts: ProfileFact[];
  generatedFromProjection: "profile_facts.current";
  createdAt: string;
  updatedAt: string;
}

export interface CareerProfilePayload {
  workspaceId?: string;
}

export const definition: DomainDefinition = {
  name: "Career Profile Domain",
  slug: "career-profile",
  manager: "CareerProfileManager",
  capabilities: ["CareerProfileGenerationCapability"],
  workers: ["CareerProfileGenerationWorker"],
  tools: ["ProfileFactProjectionReaderTool", "CareerProfileSynthesisTool"],
  commands: [CAREER_PROFILE_GENERATE_COMMAND, CAREER_PROFILE_GET_COMMAND],
  events: [CAREER_PROFILE_GENERATION_STARTED_EVENT, CAREER_PROFILE_GENERATED_EVENT, CAREER_PROFILE_GENERATION_FAILED_EVENT, CAREER_PROFILE_LOADED_EVENT],
  permissions: [],
  dependencies: ["profile-facts", "profile_facts.current", "event-store", "state-store"],
  status: "partial",
  version: "0.1.0"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProfileFact(value: unknown): value is ProfileFact {
  return isRecord(value) && typeof value.id === "string" && typeof value.claim === "string" && typeof value.category === "string" && Array.isArray(value.allowedUses) && Array.isArray(value.blockedUses);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function top(values: string[], count: number) {
  return unique(values).slice(0, count);
}

const domainSignals = [
  { label: "SIEM", terms: ["siem", "security information and event management"] },
  { label: "Splunk", terms: ["splunk", "spl", "search head", "indexer", "enterprise security"] },
  { label: "Cribl", terms: ["cribl", "logstream", "pipeline", "log routing"] },
  { label: "Security Operations", terms: ["security operations", "soc", "alert triage", "security monitoring"] },
  { label: "Detection Engineering", terms: ["detection", "correlation", "threat hunting", "false positive", "alert tuning"] },
  { label: "Incident Response", terms: ["incident response", "incident responder"] },
  { label: "Cloud Security", terms: ["cloud security", "aws", "azure", "gcp", "cloudtrail", "iam"] },
  { label: "Log Management", terms: ["log management", "syslog", "log onboarding", "telemetry"] },
  { label: "Automation", terms: ["automation", "automated", "python", "terraform"] },
  { label: "Linux Security", terms: ["linux", "auditd", "endpoint security"] }
];

function strongestDomainLabels(facts: ProfileFact[]) {
  const searchableText = facts
    .filter((fact) => ["skill", "tool", "achievement", "domain_experience", "work_history"].includes(fact.category))
    .map((fact) => fact.claim.toLowerCase())
    .join("\n");

  return domainSignals
    .filter((signal) => signal.terms.some((term) => searchableText.includes(term)))
    .map((signal) => signal.label)
    .slice(0, 8);
}

function factUsable(fact: ProfileFact) {
  return fact.truthStatus !== "blocked" && fact.truthStatus !== "rejected";
}

function useAllowed(fact: ProfileFact, use: "resume" | "interview_prep" | "recruiter_email" | "application_packet" | "career_strategy") {
  return factUsable(fact) && fact.allowedUses.includes(use) && !fact.blockedUses.includes(use);
}

function certificationFactUsableAsSearchKeyword(fact: ProfileFact) {
  return fact.category === "certification" && factUsable(fact);
}

function shouldAvoidClaim(fact: ProfileFact) {
  if (certificationFactUsableAsSearchKeyword(fact)) return false;
  return fact.truthStatus === "blocked" || fact.truthStatus === "rejected" || fact.allowedUses.length === 0;
}

export class CareerProfileGenerationWorker {
  generate(input: { userId: string; workspaceId: string; facts: ProfileFact[] }): CareerProfile {
    const usableFacts = input.facts.filter(factUsable);
    const resumeSafeFacts = usableFacts.filter((fact) => useAllowed(fact, "resume"));
    const interviewSafeFacts = usableFacts.filter((fact) => useAllowed(fact, "interview_prep"));
    const recruiterEmailSafeFacts = usableFacts.filter((fact) => useAllowed(fact, "recruiter_email"));
    const applicationPacketSafeFacts = usableFacts.filter((fact) => useAllowed(fact, "application_packet"));
    const now = new Date().toISOString();
    const normalizedTargets = normalizeCareerTargets(usableFacts);
    const partial = {
      targetTitles: normalizedTargets.cleanTargetTitles,
      strongestSkills: top(usableFacts.filter((fact) => fact.category === "skill").map((fact) => fact.claim), 12),
      strongestTools: top(usableFacts.filter((fact) => fact.category === "tool").map((fact) => fact.claim), 12),
      strongestDomains: strongestDomainLabels(usableFacts),
      strongestAchievements: top(resumeSafeFacts.filter((fact) => fact.category === "achievement").map((fact) => fact.claim), 8)
    };
    const profile: CareerProfile = {
      id: `career_profile_${input.userId}`,
      workspaceId: input.workspaceId,
      userId: input.userId,
      ...partial,
      suggestedResumeVariants: top(partial.targetTitles.map((title) => `${title} resume`), 5),
      suggestedJobSearchKeywords: normalizedTargets.suggestedJobSearchKeywords,
      fastestRoleTargets: top(partial.targetTitles, 4),
      searchDiagnostics: normalizedTargets,
      missingEvidence: top(input.facts.filter((fact) => fact.truthStatus === "needs_evidence" && fact.category !== "certification").map((fact) => fact.claim), 20),
      claimsToAvoid: top(input.facts.filter(shouldAvoidClaim).map((fact) => fact.claim), 20),
      resumeSafeFacts,
      interviewSafeFacts,
      recruiterEmailSafeFacts,
      applicationPacketSafeFacts,
      generatedFromProjection: "profile_facts.current",
      createdAt: now,
      updatedAt: now
    };
    return profile;
  }
}

type CareerProfileContext = DomainExecutionContext & { eventStore: EventStore; stateStore: StateStore };

async function loadFacts(context: CareerProfileContext, userId?: string) {
  const projections = await context.stateStore.listByProjectionType("profile_facts.current", userId ? { userId } : undefined);
  return projections.map((projection) => projection.data).filter(isProfileFact);
}

async function loadProfile(context: CareerProfileContext, userId?: string) {
  const projection = await context.stateStore.getProjection("career_profile", userId ?? "default", CAREER_PROFILE_CURRENT_PROJECTION, userId ? { userId } : undefined);
  return isRecord(projection?.data) ? projection.data as unknown as CareerProfile : undefined;
}

export class CareerProfileManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "CareerProfileGenerationCapability",
      workers: ["CareerProfileGenerationWorker"],
      commands: [CAREER_PROFILE_GENERATE_COMMAND, CAREER_PROFILE_GET_COMMAND],
      events: [CAREER_PROFILE_GENERATION_STARTED_EVENT, CAREER_PROFILE_GENERATED_EVENT, CAREER_PROFILE_GENERATION_FAILED_EVENT, CAREER_PROFILE_LOADED_EVENT],
      permissions: []
    }
  ];

  constructor(private readonly worker = new CareerProfileGenerationWorker()) {}

  canHandle(command: CareerCommand) {
    return command.type === CAREER_PROFILE_GENERATE_COMMAND || command.type === CAREER_PROFILE_GET_COMMAND;
  }

  async handle(command: CareerCommand<CareerProfilePayload>, context: DomainExecutionContext): Promise<CommandResult> {
    const executionContext = context as CareerProfileContext;
    if (command.type === CAREER_PROFILE_GET_COMMAND) return this.handleGet(command, executionContext);
    if (command.type === CAREER_PROFILE_GENERATE_COMMAND) return this.handleGenerate(command, executionContext);
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleGet(command: CareerCommand<CareerProfilePayload>, context: CareerProfileContext): Promise<CommandResult<CareerProfile | undefined>> {
    const profile = await loadProfile(context, command.userId);
    await context.eventStore.append({ eventType: CAREER_PROFILE_LOADED_EVENT, entityType: "career_profile", entityId: command.userId ?? "default", domain: this.domainSlug, manager: definition.manager, capability: "CareerProfileGenerationCapability", worker: "CareerProfileProjectionReader", userId: command.userId, payload: { commandId: command.id, found: Boolean(profile) }, confidence: 1 });
    return { ok: true, status: "completed", commandId: command.id, data: profile, emittedEvents: [CAREER_PROFILE_LOADED_EVENT], updatedProjections: [] };
  }

  private async handleGenerate(command: CareerCommand<CareerProfilePayload>, context: CareerProfileContext): Promise<CommandResult<CareerProfile>> {
    const entityId = command.entityId ?? command.userId ?? "default";
    try {
      if (!command.userId) return { ok: false, status: "rejected", commandId: command.id, error: { code: "USER_ID_REQUIRED", message: "Career profile generation requires a userId." } };
      const startedEvent = await context.eventStore.append({ eventType: CAREER_PROFILE_GENERATION_STARTED_EVENT, entityType: "career_profile", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerProfileGenerationCapability", worker: "CareerProfileGenerationWorker", userId: command.userId, payload: { commandId: command.id, sourceProjection: "profile_facts.current" }, confidence: 1 });
      const facts = await loadFacts(context, command.userId);
      const profile = this.worker.generate({ userId: command.userId, workspaceId: command.payload?.workspaceId ?? "default", facts });
      const generatedEvent = await context.eventStore.append({ eventType: CAREER_PROFILE_GENERATED_EVENT, entityType: "career_profile", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerProfileGenerationCapability", worker: "CareerProfileGenerationWorker", userId: command.userId, payload: { commandId: command.id, profile, sourceEventId: startedEvent.id, loadedFactCount: facts.length }, evidence: { projectionType: "profile_facts.current", loadedFactCount: facts.length }, confidence: 1 });
      await context.stateStore.upsertProjection({ userId: command.userId, projectionType: CAREER_PROFILE_CURRENT_PROJECTION, entityType: "career_profile", entityId, sourceEventId: generatedEvent.id, data: profile, updatedAt: new Date(profile.updatedAt) });
      return { ok: true, status: "completed", commandId: command.id, data: profile, emittedEvents: [CAREER_PROFILE_GENERATION_STARTED_EVENT, CAREER_PROFILE_GENERATED_EVENT], updatedProjections: [CAREER_PROFILE_CURRENT_PROJECTION] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown career profile generation failure";
      await context.eventStore.append({ eventType: CAREER_PROFILE_GENERATION_FAILED_EVENT, entityType: "career_profile", entityId, domain: this.domainSlug, manager: definition.manager, capability: "CareerProfileGenerationCapability", worker: "CareerProfileGenerationWorker", userId: command.userId, payload: { commandId: command.id, message }, confidence: 1 });
      return { ok: false, status: "failed", commandId: command.id, error: { code: "CAREER_PROFILE_GENERATION_FAILED", message }, emittedEvents: [CAREER_PROFILE_GENERATION_FAILED_EVENT], updatedProjections: [CAREER_PROFILE_CURRENT_PROJECTION] };
    }
  }
}

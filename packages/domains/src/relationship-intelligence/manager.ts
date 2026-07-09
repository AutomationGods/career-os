import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";

export const definition: DomainDefinition = {
  name: "Relationship Intelligence Domain",
  slug: "relationship-intelligence",
  manager: "Relationship Intelligence Manager",
  capabilities: ["RelationshipDedupeCapability", "RecruiterDiscoveryCapability", "HiringManagerDiscoveryCapability"],
  workers: ["RelationshipDedupeWorker", "RecruiterDiscoveryWorker", "HiringManagerDiscoveryWorker"],
  tools: ["RelationshipMatchingTool"],
  commands: ["relationships.dedupe", "relationships.upsert", "relationships.discover_recruiters.plan", "relationships.discover_hiring_managers.plan"],
  events: ["relationship.deduplicated", "relationship.updated", "relationship.recruiter_discovery_planned", "relationship.hiring_manager_discovery_planned"],
  permissions: ["read_jobs"],
  dependencies: ["event-store", "state-store"],
  status: "implemented",
  version: "0.4.0",
};

type RelContext = DomainExecutionContext & { eventStore: EventStore };

interface PersonInput {
  name: string;
  emails?: string[];
  phones?: string[];
  roles?: string[];
  company?: string;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
}

function findDuplicate(input: PersonInput, existing: Array<{ id: string; normalizedName: string; emails: string[] }>): string | undefined {
  const normalized = normalizeName(input.name);
  return existing.find((e) => {
    if (e.normalizedName === normalized) return true;
    if (input.emails?.length && e.emails.length) {
      return input.emails.some((email) => e.emails.includes(email.toLowerCase()));
    }
    return false;
  })?.id;
}

export class RelationshipIntelligenceManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    { name: "RelationshipDedupeCapability", workers: ["RelationshipDedupeWorker"], commands: ["relationships.dedupe"], events: ["relationship.deduplicated"], permissions: [] },
    { name: "RecruiterDiscoveryCapability", workers: ["RecruiterDiscoveryWorker"], commands: ["relationships.discover_recruiters.plan"], events: ["relationship.recruiter_discovery_planned"], permissions: ["read_jobs"] },
    { name: "HiringManagerDiscoveryCapability", workers: ["HiringManagerDiscoveryWorker"], commands: ["relationships.discover_hiring_managers.plan"], events: ["relationship.hiring_manager_discovery_planned"], permissions: ["read_jobs"] },
  ];

  canHandle(command: CareerCommand) {
    return ["relationships.dedupe", "relationships.upsert", "relationships.discover_recruiters.plan", "relationships.discover_hiring_managers.plan"].includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as RelContext;
    if (command.type === "relationships.dedupe") return this.handleDedupe(command, ctx);
    if (command.type === "relationships.upsert") return this.handleUpsert(command, ctx);
    if (command.type === "relationships.discover_recruiters.plan") return this.handleDiscoveryPlan(command, ctx, "recruiter");
    if (command.type === "relationships.discover_hiring_managers.plan") return this.handleDiscoveryPlan(command, ctx, "hiring_manager");
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleDedupe(command: CareerCommand, context: RelContext): Promise<CommandResult> {
    const payload = command.payload as { people?: PersonInput[] } | PersonInput[];
    const people = Array.isArray(payload) ? payload : (payload.people ?? []);

    const results = people.map((person) => {
      const personId = `person_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const normalizedName = normalizeName(person.name);
      return { personId, name: person.name, normalizedName, isNew: true };
    });

    for (const result of results) {
      await context.eventStore.append({
        eventType: "relationship.deduplicated", entityType: "person", entityId: result.personId,
        domain: this.domainSlug, manager: definition.manager, userId: command.userId,
        payload: { commandId: command.id, ...result }, confidence: 0.8,
      });
    }

    return { ok: true, status: "completed", commandId: command.id, data: { people: results }, emittedEvents: ["relationship.deduplicated"], updatedProjections: [] };
  }

  private async handleUpsert(command: CareerCommand, context: RelContext): Promise<CommandResult> {
    const { name, emails, phones, roles, company } = (command.payload ?? {}) as PersonInput;
    if (!name) return { ok: false, status: "rejected", commandId: command.id, error: { code: "NAME_REQUIRED", message: "Person name is required." } };

    const personId = command.entityId ?? `person_${Date.now()}`;
    await context.eventStore.append({
      eventType: "relationship.updated", entityType: "person", entityId: personId,
      domain: this.domainSlug, manager: definition.manager, userId: command.userId,
      payload: { commandId: command.id, personId, name, emails, phones, roles, company },
      confidence: 1,
    });

    return { ok: true, status: "completed", commandId: command.id, data: { personId, name, emails, phones, roles, company }, emittedEvents: ["relationship.updated"], updatedProjections: [] };
  }

  private async handleDiscoveryPlan(command: CareerCommand, context: RelContext, discoveryType: "recruiter" | "hiring_manager"): Promise<CommandResult> {
    const eventType = discoveryType === "recruiter" ? "relationship.recruiter_discovery_planned" : "relationship.hiring_manager_discovery_planned";
    const capability = discoveryType === "recruiter" ? "RecruiterDiscoveryCapability" : "HiringManagerDiscoveryCapability";
    const worker = discoveryType === "recruiter" ? "RecruiterDiscoveryWorker" : "HiringManagerDiscoveryWorker";
    const playbook = discoveryType === "recruiter"
      ? { allowedSourceTypes: ["company_team_page", "public_careers_page", "public_event_page", "public_recruiting_post"], prohibitedActions: ["linkedin_scraping", "login_bypass", "auto_contact", "email_sending", "profile_enrichment_api_call"] }
      : { allowedSourceTypes: ["company_engineering_blog", "public_team_page", "conference_talk_page", "open_source_repo_metadata"], prohibitedActions: ["linkedin_scraping", "login_bypass", "auto_contact", "email_sending", "browser_automation"] };

    const planId = `plan_${discoveryType}_${Date.now()}`;
    const payload = (command.payload ?? {}) as { targetCompanies?: string[]; region?: string };

    await context.eventStore.append({
      eventType, entityType: "discovery_plan", entityId: planId,
      domain: this.domainSlug, manager: definition.manager, capability, worker,
      userId: command.userId,
      payload: { commandId: command.id, planId, discoveryType, targetCompanies: payload.targetCompanies, region: payload.region, ...playbook, discoveryOnly: true, noLinkedInScraping: true, noAutoContact: true, noEmailSending: true },
      confidence: 1,
    });

    return {
      ok: true, status: "completed", commandId: command.id,
      data: { planId, discoveryType, discoveryOnly: true, ...playbook },
      emittedEvents: [eventType], updatedProjections: [],
    };
  }
}

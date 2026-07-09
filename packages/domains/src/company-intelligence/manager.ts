import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import { COMPANY_ENRICH_COMMAND, COMPANY_TRACK_TECH_STACK_COMMAND } from "./commands";
import { COMPANY_ENRICHED_EVENT, COMPANY_ENRICHMENT_FAILED_EVENT, COMPANY_TECH_STACK_TRACKED_EVENT } from "./events";

export const definition: DomainDefinition = {
  name: "Company Intelligence Domain",
  slug: "company-intelligence",
  manager: "Company Intelligence Manager",
  capabilities: ["CompanyEnrichmentCapability", "TechStackTrackingCapability"],
  workers: ["CompanyEnrichmentWorker"],
  tools: ["JobDescriptionParserTool"],
  commands: [COMPANY_ENRICH_COMMAND, COMPANY_TRACK_TECH_STACK_COMMAND],
  events: [COMPANY_ENRICHED_EVENT, COMPANY_TECH_STACK_TRACKED_EVENT, COMPANY_ENRICHMENT_FAILED_EVENT],
  permissions: [],
  dependencies: [],
  status: "implemented",
  version: "0.1.0",
};

type CompanyContext = DomainExecutionContext & { eventStore: EventStore };

interface CompanyEnrichPayload {
  companyId?: string;
  companyName: string;
  jobDescription?: string;
}

function extractTechStack(text: string): string[] {
  const techKeywords = [
    "splunk", "cribl", "terraform", "aws", "azure", "gcp", "kubernetes", "docker",
    "linux", "python", "java", "javascript", "typescript", "react", "node", "go",
    "siem", "devops", "sre", "observability", "pagerduty", "datadog", "grafana",
    "elasticsearch", "kafka", "redis", "postgres", "mysql", "mongodb",
  ];
  const lower = text.toLowerCase();
  return techKeywords.filter((kw) => lower.includes(kw));
}

export class CompanyIntelligenceManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "CompanyEnrichmentCapability",
      workers: ["CompanyEnrichmentWorker"],
      commands: [COMPANY_ENRICH_COMMAND],
      events: [COMPANY_ENRICHED_EVENT, COMPANY_ENRICHMENT_FAILED_EVENT],
      permissions: [],
    },
    {
      name: "TechStackTrackingCapability",
      workers: ["CompanyEnrichmentWorker"],
      commands: [COMPANY_TRACK_TECH_STACK_COMMAND],
      events: [COMPANY_TECH_STACK_TRACKED_EVENT],
      permissions: [],
    },
  ];

  canHandle(command: CareerCommand) {
    return command.type === COMPANY_ENRICH_COMMAND || command.type === COMPANY_TRACK_TECH_STACK_COMMAND;
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as CompanyContext;
    if (command.type === COMPANY_ENRICH_COMMAND) return this.handleEnrich(command, ctx);
    if (command.type === COMPANY_TRACK_TECH_STACK_COMMAND) return this.handleTrackTechStack(command, ctx);
    return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
  }

  private async handleEnrich(command: CareerCommand, context: CompanyContext): Promise<CommandResult> {
    const payload = command.payload as CompanyEnrichPayload;
    if (!payload.companyName) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMPANY_NAME_REQUIRED", message: "Company name is required." } };
    }

    try {
      const companyId = payload.companyId ?? `company_${payload.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      const techStack = payload.jobDescription ? extractTechStack(payload.jobDescription) : [];

      const enriched = {
        companyId,
        name: payload.companyName,
        techStack,
        enrichedAt: new Date().toISOString(),
        source: "job_description_extraction",
      };

      await context.eventStore.append({
        eventType: COMPANY_ENRICHED_EVENT,
        entityType: "company",
        entityId: companyId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "CompanyEnrichmentCapability",
        worker: "CompanyEnrichmentWorker",
        userId: command.userId,
        payload: { commandId: command.id, ...enriched },
        confidence: 0.8,
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: enriched,
        emittedEvents: [COMPANY_ENRICHED_EVENT],
        updatedProjections: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown enrichment failure";
      return { ok: false, status: "failed", commandId: command.id, error: { code: "COMPANY_ENRICHMENT_FAILED", message } };
    }
  }

  private async handleTrackTechStack(command: CareerCommand, context: CompanyContext): Promise<CommandResult> {
    const { companyId, companyName, jobDescription } = (command.payload ?? {}) as CompanyEnrichPayload;
    if (!companyName) {
      return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMPANY_NAME_REQUIRED", message: "Company name is required." } };
    }

    const id = companyId ?? `company_${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    const techStack = jobDescription ? extractTechStack(jobDescription) : [];

    await context.eventStore.append({
      eventType: COMPANY_TECH_STACK_TRACKED_EVENT,
      entityType: "company",
      entityId: id,
      domain: this.domainSlug,
      manager: definition.manager,
      capability: "TechStackTrackingCapability",
      worker: "CompanyEnrichmentWorker",
      userId: command.userId,
      payload: { commandId: command.id, companyId: id, companyName, techStack },
      confidence: 0.9,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { companyId: id, companyName, techStack },
      emittedEvents: [COMPANY_TECH_STACK_TRACKED_EVENT],
      updatedProjections: [],
    };
  }
}

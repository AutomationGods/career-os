import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import { SALARY_BENCHMARK_COMMAND } from "./commands";
import { SALARY_BENCHMARKED_EVENT } from "./events";

export const definition: DomainDefinition = {
  name: "Salary Intelligence Domain",
  slug: "salary-intelligence",
  manager: "Salary Intelligence Manager",
  capabilities: ["SalaryBenchmarkCapability"],
  workers: ["SalaryBenchmarkWorker"],
  tools: ["SalaryRangeParserTool"],
  commands: [SALARY_BENCHMARK_COMMAND],
  events: [SALARY_BENCHMARKED_EVENT],
  permissions: [],
  dependencies: [],
  status: "implemented",
  version: "0.1.0",
};

type SalaryContext = DomainExecutionContext & { eventStore: EventStore };

interface SalaryPayload {
  jobTitle: string;
  location?: string;
  employmentType?: string;
  rawSalaryText?: string;
}

function parseSalaryRange(text?: string): { min?: number; max?: number; currency: string } | null {
  if (!text) return null;
  const match = text.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/);
  if (match) {
    return { min: parseInt(match[1].replace(/,/g, ""), 10), max: parseInt(match[2].replace(/,/g, ""), 10), currency: "USD" };
  }
  const single = text.match(/\$?([\d,]+)/);
  if (single) return { min: parseInt(single[1].replace(/,/g, ""), 10), currency: "USD" };
  return null;
}

export class SalaryIntelligenceManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    { name: "SalaryBenchmarkCapability", workers: ["SalaryBenchmarkWorker"], commands: [SALARY_BENCHMARK_COMMAND], events: [SALARY_BENCHMARKED_EVENT], permissions: [] },
  ];

  canHandle(command: CareerCommand) { return command.type === SALARY_BENCHMARK_COMMAND; }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as SalaryContext;
    const payload = (command.payload ?? {}) as SalaryPayload;
    if (!payload.jobTitle) return { ok: false, status: "rejected", commandId: command.id, error: { code: "JOB_TITLE_REQUIRED", message: "Job title is required." } };

    const parsed = parseSalaryRange(payload.rawSalaryText);
    const entityId = `salary_${Date.now()}`;

    await ctx.eventStore.append({
      eventType: SALARY_BENCHMARKED_EVENT,
      entityType: "salary_benchmark",
      entityId,
      domain: this.domainSlug,
      manager: definition.manager,
      userId: command.userId,
      payload: { commandId: command.id, jobTitle: payload.jobTitle, location: payload.location, parsed },
      confidence: parsed ? 0.7 : 0.3,
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: { jobTitle: payload.jobTitle, location: payload.location, salaryRange: parsed, note: parsed ? "Parsed from job posting." : "No salary data found in job description." },
      emittedEvents: [SALARY_BENCHMARKED_EVENT],
      updatedProjections: [],
    };
  }
}

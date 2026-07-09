import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import { ATS_DETECT_COMMAND } from "./commands";
import { ATS_DETECTED_EVENT } from "./events";

export const definition: DomainDefinition = {
  name: "ATS Intelligence Domain",
  slug: "ats-intelligence",
  manager: "ATS Intelligence Manager",
  capabilities: ["ATSDetectionCapability"],
  workers: ["ATSDetectionWorker"],
  tools: ["AtsFingerprintTool"],
  commands: [ATS_DETECT_COMMAND],
  events: [ATS_DETECTED_EVENT],
  permissions: [],
  dependencies: [],
  status: "implemented",
  version: "0.1.0",
};

type AtsContext = DomainExecutionContext & { eventStore: EventStore };

const ATS_FINGERPRINTS: Record<string, string[]> = {
  greenhouse: ["greenhouse.io", "boards.greenhouse"],
  lever: ["lever.co", "jobs.lever"],
  ashby: ["ashbyhq.com", "jobs.ashbyhq"],
  workday: ["workday.com", "myworkdayjobs"],
  icims: ["icims.com"],
  smartrecruiters: ["smartrecruiters.com"],
  taleo: ["taleo.net"],
  bamboohr: ["bamboohr.com"],
  jobvite: ["jobvite.com"],
};

function detectATS(url?: string, text?: string): string {
  const combined = `${url ?? ""} ${text ?? ""}`.toLowerCase();
  for (const [ats, patterns] of Object.entries(ATS_FINGERPRINTS)) {
    if (patterns.some((p) => combined.includes(p))) return ats;
  }
  return "unknown";
}

export class AtsIntelligenceManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    { name: "ATSDetectionCapability", workers: ["ATSDetectionWorker"], commands: [ATS_DETECT_COMMAND], events: [ATS_DETECTED_EVENT], permissions: [] },
  ];

  canHandle(command: CareerCommand) { return command.type === ATS_DETECT_COMMAND; }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as AtsContext;
    const { url, pageText } = (command.payload ?? {}) as { url?: string; pageText?: string };
    const detectedAts = detectATS(url, pageText);

    await ctx.eventStore.append({
      eventType: ATS_DETECTED_EVENT, entityType: "ats_detection", entityId: command.entityId ?? `ats_${Date.now()}`,
      domain: this.domainSlug, manager: definition.manager, userId: command.userId,
      payload: { commandId: command.id, detectedAts, url }, confidence: detectedAts !== "unknown" ? 0.9 : 0.1,
    });

    return { ok: true, status: "completed", commandId: command.id, data: { detectedAts, url, known: detectedAts !== "unknown" }, emittedEvents: [ATS_DETECTED_EVENT], updatedProjections: [] };
  }
}

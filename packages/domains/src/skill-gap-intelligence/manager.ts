import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import type { StateStore } from "@career-os/state";
import { SKILL_GAP_ANALYZE_COMMAND } from "./commands";
import { SKILL_GAP_ANALYZED_EVENT } from "./events";

export const definition: DomainDefinition = {
  name: "Skill Gap Intelligence Domain",
  slug: "skill-gap-intelligence",
  manager: "Skill Gap Intelligence Manager",
  capabilities: ["SkillGapAnalysisCapability"],
  workers: ["SkillGapWorker"],
  tools: ["SkillComparisonTool"],
  commands: [SKILL_GAP_ANALYZE_COMMAND],
  events: [SKILL_GAP_ANALYZED_EVENT],
  permissions: [],
  dependencies: ["career-profile", "profile-facts"],
  status: "implemented",
  version: "0.1.0",
};

type SkillGapContext = DomainExecutionContext & { eventStore: EventStore; stateStore: StateStore };

interface SkillGapPayload {
  requiredSkills?: string[];
  jobId?: string;
}

export class SkillGapIntelligenceManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    { name: "SkillGapAnalysisCapability", workers: ["SkillGapWorker"], commands: [SKILL_GAP_ANALYZE_COMMAND], events: [SKILL_GAP_ANALYZED_EVENT], permissions: [] },
  ];

  canHandle(command: CareerCommand) { return command.type === SKILL_GAP_ANALYZE_COMMAND; }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as SkillGapContext;
    const payload = (command.payload ?? {}) as SkillGapPayload;
    const userId = command.userId ?? "default";

    const requiredSkills = (payload.requiredSkills ?? []).map((s) => s.toLowerCase());
    const factProjections = await ctx.stateStore.listByProjectionType("profile_facts.current", { userId });
    const userSkills = factProjections
      .map((p) => p.data as { category?: string; claim?: string })
      .filter((f) => f.category === "skill" || f.category === "tool")
      .map((f) => (f.claim ?? "").toLowerCase());

    const matched = requiredSkills.filter((skill) => userSkills.some((us) => us.includes(skill)));
    const gaps = requiredSkills.filter((skill) => !matched.some((m) => m.includes(skill)));
    const coverage = requiredSkills.length > 0 ? Math.round((matched.length / requiredSkills.length) * 100) : 100;

    const learningPaths = gaps.map((gap) => ({
      skill: gap,
      suggestion: `Research and practice ${gap} through hands-on projects or certifications.`,
      priority: "medium" as const,
    }));

    await ctx.eventStore.append({
      eventType: SKILL_GAP_ANALYZED_EVENT, entityType: "skill_gap", entityId: command.entityId ?? `gap_${Date.now()}`,
      domain: this.domainSlug, manager: definition.manager, userId: command.userId,
      payload: { commandId: command.id, jobId: payload.jobId, coverage, matchedCount: matched.length, gapCount: gaps.length },
      confidence: 0.7,
    });

    return {
      ok: true, status: "completed", commandId: command.id,
      data: { coverage, matched, gaps, learningPaths, requiredSkillCount: requiredSkills.length },
      emittedEvents: [SKILL_GAP_ANALYZED_EVENT], updatedProjections: [],
    };
  }
}

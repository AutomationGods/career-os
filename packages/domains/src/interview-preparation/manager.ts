import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { EventStore } from "@career-os/events";
import type { StateStore } from "@career-os/state";
import {
  INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND,
  INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND,
} from "./commands";
import {
  INTERVIEW_PREP_FAILED_EVENT,
  INTERVIEW_PREP_QUESTIONS_GENERATED_EVENT,
  INTERVIEW_PREP_TALKING_POINTS_GENERATED_EVENT,
} from "./events";

export const definition: DomainDefinition = {
  name: "Interview Preparation Domain",
  slug: "interview-preparation",
  manager: "Interview Preparation Manager",
  capabilities: ["InterviewQuestionGenerationCapability", "TalkingPointsGenerationCapability"],
  workers: ["InterviewQuestionWorker", "TalkingPointsWorker"],
  tools: ["JobDescriptionAnalysisTool", "ProfileFactMappingTool"],
  commands: [INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND, INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND],
  events: [INTERVIEW_PREP_QUESTIONS_GENERATED_EVENT, INTERVIEW_PREP_TALKING_POINTS_GENERATED_EVENT, INTERVIEW_PREP_FAILED_EVENT],
  permissions: [],
  dependencies: ["career-profile", "profile-facts"],
  status: "implemented",
  version: "0.1.0",
};

type InterviewPrepContext = DomainExecutionContext & { eventStore: EventStore; stateStore: StateStore };

interface InterviewPrepPayload {
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
}

const COMMON_INTERVIEW_QUESTIONS = [
  "Tell me about yourself.",
  "Why are you interested in this role?",
  "What are your greatest strengths?",
  "Describe a challenging project you worked on.",
  "Where do you see yourself in 5 years?",
  "Why should we hire you?",
  "Do you have any questions for us?",
];

function generateLikelyQuestions(jobTitle: string, jobDescription?: string): string[] {
  const roleSpecific = [
    `What experience do you have relevant to the ${jobTitle} role?`,
    `How would you approach your first 90 days in this position?`,
    `What tools and technologies are you most comfortable with for this role?`,
  ];

  if (jobDescription?.toLowerCase().includes("team")) {
    roleSpecific.push("Describe your experience working in a team environment.");
  }
  if (jobDescription?.toLowerCase().includes("lead")) {
    roleSpecific.push("Tell me about a time you led a project or initiative.");
  }

  return [...COMMON_INTERVIEW_QUESTIONS.slice(0, 4), ...roleSpecific];
}

function generateTalkingPoints(jobTitle: string, profileFacts: Array<{ claim?: string; category?: string }>): Array<{ topic: string; evidence: string; format: string }> {
  const points: Array<{ topic: string; evidence: string; format: string }> = [];

  const skills = profileFacts.filter((f) => f.category === "skill" || f.category === "tool");
  if (skills.length > 0) {
    points.push({
      topic: "Technical Skills",
      evidence: skills.slice(0, 5).map((f) => f.claim).join("; "),
      format: "STAR: Situation → Task → Action → Result",
    });
  }

  const experience = profileFacts.filter((f) => f.category === "experience");
  if (experience.length > 0) {
    points.push({
      topic: "Relevant Experience",
      evidence: experience.slice(0, 3).map((f) => f.claim).join("; "),
      format: "STAR: Describe the context, your role, actions taken, and outcomes",
    });
  }

  points.push({
    topic: `Fit for ${jobTitle}`,
    evidence: "Connect your background to the specific requirements listed in the job description.",
    format: "Direct: state the connection clearly, then give one concrete example.",
  });

  return points;
}

export class InterviewPreparationManager implements DomainManagerContract {
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "InterviewQuestionGenerationCapability",
      workers: ["InterviewQuestionWorker"],
      commands: [INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND],
      events: [INTERVIEW_PREP_QUESTIONS_GENERATED_EVENT, INTERVIEW_PREP_FAILED_EVENT],
      permissions: [],
    },
    {
      name: "TalkingPointsGenerationCapability",
      workers: ["TalkingPointsWorker"],
      commands: [INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND],
      events: [INTERVIEW_PREP_TALKING_POINTS_GENERATED_EVENT, INTERVIEW_PREP_FAILED_EVENT],
      permissions: [],
    },
  ];

  canHandle(command: CareerCommand) {
    return [INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND, INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND].includes(command.type);
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult> {
    const ctx = context as InterviewPrepContext;
    const payload = (command.payload ?? {}) as InterviewPrepPayload;

    switch (command.type) {
      case INTERVIEW_PREP_GENERATE_QUESTIONS_COMMAND:
        return this.handleGenerateQuestions(command, ctx, payload);
      case INTERVIEW_PREP_GENERATE_TALKING_POINTS_COMMAND:
        return this.handleGenerateTalkingPoints(command, ctx, payload);
      default:
        return { ok: false, status: "rejected", commandId: command.id, error: { code: "COMMAND_NOT_SUPPORTED", message: `${this.domainName} cannot handle ${command.type}` } };
    }
  }

  private async handleGenerateQuestions(command: CareerCommand, context: InterviewPrepContext, payload: InterviewPrepPayload): Promise<CommandResult> {
    const { jobId, jobTitle = "the role", jobDescription } = payload;

    try {
      const questions = generateLikelyQuestions(jobTitle, jobDescription);
      const entityId = jobId ?? `interview_prep_${Date.now()}`;

      await context.eventStore.append({
        eventType: INTERVIEW_PREP_QUESTIONS_GENERATED_EVENT,
        entityType: "interview_prep",
        entityId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "InterviewQuestionGenerationCapability",
        worker: "InterviewQuestionWorker",
        userId: command.userId,
        payload: { commandId: command.id, jobId, jobTitle, questionCount: questions.length },
        confidence: 1,
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: { jobId, jobTitle, questions, count: questions.length },
        emittedEvents: [INTERVIEW_PREP_QUESTIONS_GENERATED_EVENT],
        updatedProjections: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown question generation failure";
      return { ok: false, status: "failed", commandId: command.id, error: { code: "INTERVIEW_PREP_FAILED", message } };
    }
  }

  private async handleGenerateTalkingPoints(command: CareerCommand, context: InterviewPrepContext, payload: InterviewPrepPayload): Promise<CommandResult> {
    const { jobId, jobTitle = "the role" } = payload;
    const userId = command.userId ?? "default";

    try {
      const factProjections = await context.stateStore.listByProjectionType("profile_facts.current", { userId });
      const facts = factProjections.map((p) => p.data as { claim?: string; category?: string });
      const talkingPoints = generateTalkingPoints(jobTitle, facts);
      const entityId = jobId ?? `interview_prep_${Date.now()}`;

      await context.eventStore.append({
        eventType: INTERVIEW_PREP_TALKING_POINTS_GENERATED_EVENT,
        entityType: "interview_prep",
        entityId,
        domain: this.domainSlug,
        manager: definition.manager,
        capability: "TalkingPointsGenerationCapability",
        worker: "TalkingPointsWorker",
        userId: command.userId,
        payload: { commandId: command.id, jobId, jobTitle, talkingPointCount: talkingPoints.length, factCount: facts.length },
        confidence: 1,
      });

      return {
        ok: true,
        status: "completed",
        commandId: command.id,
        data: { jobId, jobTitle, talkingPoints, factCount: facts.length },
        emittedEvents: [INTERVIEW_PREP_TALKING_POINTS_GENERATED_EVENT],
        updatedProjections: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown talking points generation failure";
      return { ok: false, status: "failed", commandId: command.id, error: { code: "INTERVIEW_PREP_FAILED", message } };
    }
  }
}

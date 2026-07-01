import { eventStore, type EventStore } from "@career-os/events";
import { snapshotStore, type SnapshotStore } from "@career-os/snapshots";
import { stateStore, type StateStore } from "@career-os/state";
import type { JobSegment, NormalizedJob } from "@career-os/shared";
import { classifyRemote, normalizeJob, scoreFit, segmentClearance, segmentJob, summarizeFitScore, type FitScoreSummary } from "./index";

export interface JobPipelineInput extends Partial<NormalizedJob> {
  id?: string;
  companyId?: string;
  certifications?: string[];
  requiredFields?: string[];
  hasEasyApply?: boolean;
  recruiterEmail?: string;
  userId?: string;
  profileSkills?: string[];
  targetKeywords?: string[];
}

export interface JobPipelineStores {
  eventStore?: EventStore;
  stateStore?: StateStore;
  snapshotStore?: SnapshotStore;
}

export interface JobPipelineResult {
  jobId: string;
  normalizedJob: NormalizedJob;
  remoteClassification: ReturnType<typeof classifyRemote>;
  clearanceSegment: JobSegment | null;
  certificationClassification: { required: string[]; preferred: string[]; blocked: string[] };
  fitScore: number;
  fitScoreSummary: FitScoreSummary;
  applicationDifficultyScore: number;
  dashboardSegment: JobSegment;
  eventsEmitted: string[];
}

const blockedCertifications = ["cissp", "security+"];
const pipelineEventTypes = [
  "job.normalized",
  "job.remote_classified",
  "job.clearance_segmented",
  "job.certification_classified",
  "job.scored",
  "job.application_difficulty_scored",
  "job.pipeline_completed"
];

export function classifyCertifications(job: NormalizedJob, explicit: string[] = []) {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const found = [...explicit, ...blockedCertifications.filter((cert) => text.includes(cert))];
  return { required: found, preferred: [], blocked: found.filter((cert) => blockedCertifications.includes(cert.toLowerCase())) };
}

export function scoreApplicationDifficulty(input: JobPipelineInput): number {
  const fields = input.requiredFields?.length ?? 0;
  const easyApplyAdjustment = input.hasEasyApply ? -20 : 0;
  return Math.max(0, Math.min(100, 25 + fields * 5 + easyApplyAdjustment));
}

export async function runJobPipeline(input: JobPipelineInput, stores: JobPipelineStores = {}): Promise<JobPipelineResult> {
  const jobId = input.id ?? `job_${Date.now()}`;
  const eventsEmitted: string[] = [];
  const events = stores.eventStore ?? eventStore;
  const states = stores.stateStore ?? stateStore;
  const snapshots = stores.snapshotStore ?? snapshotStore;

  try {
    await snapshots.captureSnapshot({
      userId: input.userId,
      entityType: "job",
      entityId: jobId,
      snapshotType: "job.pipeline_input",
      data: input
    });

    const normalizedJob = normalizeJob(input as Partial<NormalizedJob> & Record<string, unknown>);
    const remoteClassification = classifyRemote(normalizedJob);
    const clearanceSegment = segmentClearance(normalizedJob);
    const certificationClassification = classifyCertifications(normalizedJob, input.certifications);
    const fitScoreSummary = summarizeFitScore(normalizedJob, { profileSkills: input.profileSkills, targetKeywords: input.targetKeywords });
    const fitScore = fitScoreSummary.score;
    const applicationDifficultyScore = scoreApplicationDifficulty(input);
    const dashboardSegment = certificationClassification.blocked.length > 0 ? "Low Fit" : segmentJob(normalizedJob);
    const payload = {
      normalizedJob,
      remoteClassification,
      clearanceSegment,
      certificationClassification,
      fitScore,
      fitScoreSummary,
      applicationDifficultyScore,
      dashboardSegment
    };

    let completedEventId: string | undefined;
    for (const eventType of pipelineEventTypes) {
      const saved = await events.append({
        eventType,
        entityType: "job",
        entityId: jobId,
        domain: "job-intelligence",
        manager: "Job Intelligence Manager",
        capability: "JobPipelineCapability",
        worker: "JobPipelineWorker",
        userId: input.userId,
        payload,
        evidence: { source: input.source ?? "pipeline", inputSnapshotCaptured: true },
        confidence: eventType === "job.pipeline_completed" ? 1 : undefined
      });
      if (eventType === "job.pipeline_completed") completedEventId = saved.id;
      eventsEmitted.push(eventType);
    }

    await states.upsertProjection({
      userId: input.userId,
      projectionType: "job.dashboard_segment",
      entityType: "job",
      entityId: jobId,
      data: { jobId, ...payload, updatedBy: "job.pipeline_completed" },
      sourceEventId: completedEventId,
      updatedAt: new Date()
    });

    return { jobId, normalizedJob, remoteClassification, clearanceSegment, certificationClassification, fitScore, fitScoreSummary, applicationDifficultyScore, dashboardSegment, eventsEmitted };
  } catch (error) {
    await events.append({
      eventType: "job.pipeline_failed",
      entityType: "job",
      entityId: jobId,
      domain: "job-intelligence",
      manager: "Job Intelligence Manager",
      capability: "JobPipelineCapability",
      worker: "JobPipelineWorker",
      userId: input.userId,
      payload: { message: error instanceof Error ? error.message : "Unknown pipeline failure" },
      confidence: 1
    });
    throw error;
  }
}

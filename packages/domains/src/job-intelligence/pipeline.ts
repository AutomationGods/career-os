import { eventStore, type EventStore } from "@career-os/events";
import { snapshotStore, type SnapshotStore } from "@career-os/snapshots";
import { stateStore, type StateStore } from "@career-os/state";
import type { JobSegment, NormalizedJob } from "@career-os/shared";
import type { JobStore, PersistedJobRecord } from "../job-discovery/job-store";
import { classifyRemote, normalizeJob, scoreFit, segmentClearance, segmentJob } from "./index";

export interface JobPipelineInput extends Partial<NormalizedJob> {
  id?: string;
  companyId?: string;
  certifications?: string[];
  requiredFields?: string[];
  hasEasyApply?: boolean;
  recruiterEmail?: string;
  userId?: string;
}

export interface JobPipelineStores {
  eventStore?: EventStore;
  stateStore?: StateStore;
  snapshotStore?: SnapshotStore;
  jobStore?: JobStore;
}

export interface JobPipelineResult {
  jobId: string;
  normalizedJob: NormalizedJob;
  remoteClassification: ReturnType<typeof classifyRemote>;
  clearanceSegment: JobSegment | null;
  certificationClassification: { required: string[]; preferred: string[]; blocked: string[] };
  fitScore: number;
  applicationDifficultyScore: number;
  dashboardSegment: JobSegment;
  eventsEmitted: string[];
  persistedJob?: PersistedJobRecord;
  sourceSnapshotId?: string;
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
    const sourceSnapshot = await snapshots.captureSnapshot({
      userId: input.userId,
      entityType: "job",
      entityId: jobId,
      snapshotType: "job.pipeline_input",
      source: "job.pipeline_input",
      data: input
    });
    const sourceSnapshotId = sourceSnapshot.id;

    const normalizedJob = normalizeJob(input as Partial<NormalizedJob> & Record<string, unknown>);
    const remoteClassification = classifyRemote(normalizedJob);
    const clearanceSegment = segmentClearance(normalizedJob);
    const certificationClassification = classifyCertifications(normalizedJob, input.certifications);
    const fitScore = scoreFit(normalizedJob);
    const applicationDifficultyScore = scoreApplicationDifficulty(input);
    const dashboardSegment = certificationClassification.blocked.length > 0 ? "Low Fit" : segmentJob(normalizedJob);
    const payload = {
      normalizedJob,
      remoteClassification,
      clearanceSegment,
      certificationClassification,
      fitScore,
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
        payload: { jobId, sourceSnapshotId, ...payload },
        evidence: { source: input.source ?? "pipeline", inputSnapshotCaptured: true, sourceSnapshotId },
        confidence: eventType === "job.pipeline_completed" ? 1 : undefined
      });
      if (eventType === "job.pipeline_completed") completedEventId = saved.id;
      eventsEmitted.push(eventType);
    }

    let persistedJob: PersistedJobRecord | undefined;
    let persistedEventId: string | undefined;
    if (stores.jobStore) {
      persistedJob = await stores.jobStore.savePipelineResult({
        jobId,
        id: jobId,
        userId: input.userId,
        companyId: input.companyId,
        companyName: input.company,
        sourceSnapshotId,
        input: input as Record<string, unknown>,
        normalizedJob,
        remoteClassification,
        clearanceSegment,
        certificationClassification,
        fitScore,
        applicationDifficultyScore,
        dashboardSegment
      });
      const persisted = await events.append({
        eventType: "job.persisted",
        entityType: "job",
        entityId: jobId,
        domain: "job-intelligence",
        manager: "Job Intelligence Manager",
        capability: "JobPipelineCapability",
        worker: "JobPipelineWorker",
        userId: input.userId,
        payload: { jobId, persistedJobId: persistedJob.id, sourceSnapshotId, dashboardSegment },
        evidence: { source: input.source ?? "pipeline", sourceSnapshotId },
        confidence: 1
      });
      persistedEventId = persisted.id;
      eventsEmitted.push("job.persisted");
    }

    await states.upsertProjection({
      userId: input.userId,
      projectionType: "job.dashboard_segment",
      entityType: "job",
      entityId: jobId,
      data: { jobId, persistedJobId: persistedJob?.id, sourceSnapshotId, ...payload, updatedBy: "job.pipeline_completed" },
      sourceEventId: completedEventId,
      updatedAt: new Date()
    });

    await states.upsertProjection({
      userId: input.userId,
      projectionType: "job.pipeline_result",
      entityType: "job",
      entityId: jobId,
      data: { jobId, persistedJobId: persistedJob?.id, sourceSnapshotId, ...payload, updatedBy: persistedJob ? "job.persisted" : "job.pipeline_completed" },
      sourceEventId: persistedEventId ?? completedEventId,
      updatedAt: new Date()
    });

    return { jobId, normalizedJob, remoteClassification, clearanceSegment, certificationClassification, fitScore, applicationDifficultyScore, dashboardSegment, eventsEmitted, persistedJob, sourceSnapshotId };
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

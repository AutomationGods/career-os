import type { CareerCommand } from "@career-os/shared";

const QUEUE_NAME = "career-os";

// BullMQ v5 ESM types have a transitive resolution issue with TS 5.9 + Bundler.
// Using require() for runtime with manual type shapes.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BullMQQueue = require("bullmq").Queue;

function resolveConnection() {
  return { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _queue: any | undefined;

/**
 * Returns the shared BullMQ Queue instance. Lazy-initialized so the Redis
 * connection is only opened when first needed (API route or worker boot).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCareerQueue(): any {
  if (!_queue) {
    _queue = new BullMQQueue(QUEUE_NAME, { connection: resolveConnection() });
  }
  return _queue;
}

export interface EnqueueResult {
  jobId: string;
  commandType: string;
  status: "queued";
}

/**
 * Enqueue a CareerCommand for background processing.
 * Returns the BullMQ job id so the caller can poll for status.
 */
export async function enqueueCommand(command: CareerCommand): Promise<EnqueueResult> {
  const queue = getCareerQueue();
  const job = await queue.add(command.type, command, {
    jobId: command.id,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  });
  return { jobId: job.id, commandType: command.type, status: "queued" };
}

/**
 * Convenience: enqueue a daily mission generation command.
 */
export async function enqueueDailyMission(userId: string): Promise<EnqueueResult> {
  const { createCommand } = await import("./command-bus");
  const command = createCommand({
    type: "daily_mission.generate",
    requestedBy: "api",
    userId,
    entityType: "daily_mission",
    entityId: "today",
    payload: {},
  });
  return enqueueCommand(command);
}

export interface JobStatusResult {
  jobId: string;
  status: "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";
  result?: unknown;
  error?: string;
  progress?: unknown;
  processedOn?: number;
  finishedOn?: number;
}

/**
 * Poll the status of a previously enqueued job.
 */
export async function getJobStatus(jobId: string): Promise<JobStatusResult> {
  const queue = getCareerQueue();
  const job = await queue.getJob(jobId);
  if (!job) {
    return { jobId, status: "unknown" };
  }

  const state = await job.getState();
  const result: JobStatusResult = {
    jobId,
    status: state as JobStatusResult["status"],
    progress: job.progress,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };

  if (state === "completed") {
    result.result = job.returnvalue;
  } else if (state === "failed") {
    result.error = job.failedReason;
  }

  return result;
}

export { QUEUE_NAME };

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Job, Queue, QueueEvents, Worker } from "bullmq";

const queueName = "career-os";
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export interface DailyMissionJobData {
  requestedAt: string;
}

export interface DailyMissionJobResult {
  status: "completed";
  jobName: "daily-mission.generate";
  processedAt: string;
}

export type CareerOsJobData = DailyMissionJobData;
export type CareerOsJobResult = DailyMissionJobResult;

export const careerQueue = new Queue<CareerOsJobData, CareerOsJobResult>(queueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { age: 86_400, count: 1000 },
    removeOnFail: { age: 604_800, count: 1000 }
  }
});

export async function enqueueDailyMission() {
  return careerQueue.add("daily-mission.generate", { requestedAt: new Date().toISOString() });
}

export async function processCareerOsJob(job: Job<CareerOsJobData, CareerOsJobResult>): Promise<CareerOsJobResult> {
  if (job.name !== "daily-mission.generate") throw new Error(`Unsupported worker job: ${job.name}`);

  await job.updateProgress(100);
  return {
    status: "completed",
    jobName: "daily-mission.generate",
    processedAt: new Date().toISOString()
  };
}

export function createCareerOsWorker() {
  const worker = new Worker<CareerOsJobData, CareerOsJobResult>(queueName, processCareerOsJob, {
    connection,
    concurrency: 2,
    lockDuration: 30_000
  });
  const queueEvents = new QueueEvents(queueName, { connection });

  worker.on("completed", (job) => {
    console.info(JSON.stringify({ level: "info", event: "worker.job_completed", jobId: job.id, jobName: job.name }));
  });

  worker.on("failed", (job, error) => {
    console.error(JSON.stringify({ level: "error", event: "worker.job_failed", jobId: job?.id, jobName: job?.name, error: error.message }));
  });

  worker.on("error", (error) => {
    console.error(JSON.stringify({ level: "error", event: "worker.error", error: error.message }));
  });

  async function close() {
    await Promise.allSettled([worker.close(), queueEvents.close(), careerQueue.close()]);
  }

  return { worker, queueEvents, close };
}

function isDirectEntrypoint() {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint) && fileURLToPath(import.meta.url) === resolve(entrypoint);
}

export function startCareerOsWorker() {
  const runtime = createCareerOsWorker();
  console.info(JSON.stringify({ level: "info", event: "worker.started", queueName }));

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void runtime.close().finally(() => process.exit(0));
    });
  }

  return runtime;
}

const shouldStartWorker = isDirectEntrypoint() && process.env.CAREER_OS_WORKER_AUTOSTART !== "false";

if (shouldStartWorker) startCareerOsWorker();

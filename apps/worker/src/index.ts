import {
  createCommand,
  createOrchestrator,
  createPrismaExecutionContext,
  getCareerQueue,
  QUEUE_NAME,
  type OrchestratorContext,
} from "@career-os/orchestration";
import type { CareerCommand, CommandResult } from "@career-os/shared";

// ─── BullMQ runtime import ────────────────────────────────────────────────────
// BullMQ v5 ESM types have a transitive resolution issue with TypeScript 5.9 +
// moduleResolution:Bundler. Using require() for runtime with manual type shapes.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BullMQ = require("bullmq");

interface BullMQJob<T = unknown> {
  id: string;
  name: string;
  data: T;
}

interface BullMQWorker {
  on(event: string, handler: (...args: unknown[]) => void): void;
  close(): Promise<void>;
}

// ─── Connection ───────────────────────────────────────────────────────────────

function resolveConnection() {
  return { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
}

// ─── Supported command types ──────────────────────────────────────────────────
// enqueueCommand() uses command.type as the BullMQ job name directly.

const SUPPORTED_COMMANDS = [
  "daily_mission.generate",
  "career_opportunities.find_jobs",
  "resume.generate",
  "career_profile.generate",
];

// ─── Orchestrator singleton ───────────────────────────────────────────────────
// One orchestrator per process; Prisma client handles connection pooling.

let _orchestrator: ReturnType<typeof createOrchestrator> | undefined;
let _context: OrchestratorContext | undefined;

function getOrchestrator() {
  if (!_orchestrator) {
    _context = createPrismaExecutionContext();
    _orchestrator = createOrchestrator(_context);
  }
  return _orchestrator;
}

// ─── Job processor ────────────────────────────────────────────────────────────

async function processJob(job: BullMQJob<CareerCommand>): Promise<CommandResult> {
  const commandType = job.name;
  const rawCommand = job.data;

  // Reconstruct as a proper command if the BullMQ deserialization lost shape
  const command: CareerCommand =
    rawCommand.id && rawCommand.type && rawCommand.requestedBy
      ? rawCommand
      : createCommand({
          type: commandType,
          requestedBy: "worker",
          userId: rawCommand.userId,
          entityType: rawCommand.entityType,
          entityId: rawCommand.entityId,
          payload: rawCommand.payload ?? {},
        });

  const orchestrator = getOrchestrator();
  const result = await orchestrator.execute(command);

  if (!result.ok) {
    throw new Error(
      `[${commandType}] ${result.error?.code ?? "UNKNOWN"}: ${result.error?.message ?? "Command failed"}`,
    );
  }

  return result;
}

// ─── Worker setup ─────────────────────────────────────────────────────────────

let worker: BullMQWorker | undefined;

function createWorker() {
  worker = new BullMQ.Worker(QUEUE_NAME, processJob, {
    connection: resolveConnection(),
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 60_000, // 10 jobs per minute
    },
  }) as BullMQWorker;

  worker.on("ready", () => {
    console.log("[worker] Connected to Redis, listening on queue:", QUEUE_NAME);
  });

  worker.on("failed", (job: unknown, error: unknown) => {
    const j = job as BullMQJob | undefined;
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[worker] Job ${j?.id} (${j?.name}) failed:`, msg);
  });

  worker.on("completed", (job: unknown, result: unknown) => {
    const j = job as BullMQJob;
    const r = result as CommandResult;
    console.log(`[worker] Job ${j.id} (${j.name}) completed — status: ${r.status}`);
  });

  worker.on("error", (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[worker] Worker error:", msg);
  });

  return worker;
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] Received ${signal}, shutting down gracefully…`);

  if (worker) {
    await worker.close();
    console.log("[worker] Worker closed.");
  }

  const queue = getCareerQueue();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (queue as any).close();
  console.log("[worker] Queue connection closed.");

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Boot ─────────────────────────────────────────────────────────────────────

createWorker();
console.log("[worker] Career OS worker started. Supported commands:");
for (const commandType of SUPPORTED_COMMANDS) {
  console.log(`  ${commandType}`);
}

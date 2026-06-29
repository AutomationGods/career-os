import { prisma } from "@career-os/db";
import Redis from "ioredis";
import { ok } from "../_lib/responses";

export const dynamic = "force-dynamic";

async function checkDatabase() {
  await prisma.$queryRaw`SELECT 1`;
  return "ok" as const;
}

async function checkRedis() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL missing");
  const redis = new Redis(redisUrl, {
    connectTimeout: 1000,
    maxRetriesPerRequest: 0,
    lazyConnect: true
  });

  try {
    await redis.connect();
    const response = await redis.ping();
    if (response !== "PONG") throw new Error("Unexpected Redis response");
    return "ok" as const;
  } finally {
    redis.disconnect();
  }
}

export async function GET() {
  const checks = await Promise.allSettled([checkDatabase(), checkRedis()]);
  const database = checks[0]?.status === "fulfilled" ? "ok" : "failed";
  const redis = checks[1]?.status === "fulfilled" ? "ok" : "failed";
  const ready = database === "ok" && redis === "ok";
  const payload = { status: ready ? "ready" : "not_ready", checks: { database, redis }, checkedAt: new Date().toISOString() };

  return ready ? ok(payload) : Response.json({ ok: false, error: { code: "NOT_READY", message: "Readiness check failed." }, data: payload }, { status: 503 });
}

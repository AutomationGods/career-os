import { Queue } from "bullmq";
const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
export const careerQueue = new Queue("career-os", { connection });
export async function enqueueDailyMission() { return careerQueue.add("daily-mission.generate", { requestedAt: new Date().toISOString() }); }

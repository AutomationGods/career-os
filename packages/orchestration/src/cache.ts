// Redis caching layer for projections and search results.
// Uses ioredis directly (already a project dependency).
// Falls back to no-op when REDIS_URL is not set.

import Redis from "ioredis";

let _redis: Redis | undefined;

function getRedis(): Redis | undefined {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return undefined;
  _redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  return _redis;
}

export interface CacheOptions {
  ttlSeconds: number;
}

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, options: CacheOptions = { ttlSeconds: DEFAULT_TTL }): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", options.ttlSeconds);
  } catch {
    // Cache write failures are non-fatal
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Cache delete failures are non-fatal
  }
}

// Predefined cache key patterns and TTLs
export const cacheKeys = {
  careerProfile: (userId: string) => `cache:career_profile:${userId}`,
  jobSearchResults: (userId: string, query: string) => `cache:job_search:${userId}:${query}`,
  dailyMission: (userId: string) => `cache:daily_mission:${userId}`,
};

export const cacheTTLs = {
  careerProfile: 300,      // 5 minutes
  jobSearchResults: 900,   // 15 minutes
  dailyMission: 3600,      // 1 hour
};

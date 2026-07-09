const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 };

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  "job-discovery/search": { maxRequests: 5, windowMs: 60_000 },
  "career-command/find-jobs": { maxRequests: 5, windowMs: 60_000 },
  "resumes": { maxRequests: 10, windowMs: 60_000 },
  "career-command/import-job": { maxRequests: 3, windowMs: 60_000 },
  "source-documents/upload": { maxRequests: 10, windowMs: 60_000 },
};

export function getRateLimit(routeKey: string): RateLimitConfig {
  return ROUTE_LIMITS[routeKey] ?? DEFAULT_CONFIG;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig = DEFAULT_CONFIG): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { allowed: true, remaining: config.maxRequests - bucket.count, retryAfterMs: 0 };
}

export function rateLimitResponse(retryAfterMs: number) {
  const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({ ok: false, error: { message: "Rate limit exceeded. Try again later.", code: "RATE_LIMITED" } }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

/**
 * Clean up expired buckets. Call periodically to prevent memory leaks.
 */
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

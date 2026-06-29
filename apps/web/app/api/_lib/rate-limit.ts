export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + options.windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(options.limit - bucket.count, 0);
  return {
    allowed: bucket.count <= options.limit,
    limit: options.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "x-ratelimit-limit": String(result.limit),
    "x-ratelimit-remaining": String(result.remaining),
    "x-ratelimit-reset": String(Math.ceil(result.resetAt / 1000)),
    "retry-after": String(result.retryAfterSeconds)
  };
}

export function resetRateLimitBucketsForTests() {
  buckets.clear();
}

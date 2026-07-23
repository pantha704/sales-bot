import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Cost-sensitive API buckets. Limits are per client IP per window.
 * Prefer Upstash (serverless-safe). Falls back to process-local memory
 * when Redis env is unset — good enough for local/demo, not multi-instance.
 */
export type RateLimitBucket =
  | "roleplay-respond"
  | "roleplay-speech"
  | "roleplay-transcribe"
  | "roleplay-score"
  | "leads";

const BUCKET_CONFIG: Record<
  RateLimitBucket,
  { requests: number; window: `${number} ${"s" | "m" | "h" | "d"}` }
> = {
  "roleplay-respond": { requests: 30, window: "1 m" },
  "roleplay-speech": { requests: 30, window: "1 m" },
  "roleplay-transcribe": { requests: 15, window: "1 m" },
  "roleplay-score": { requests: 10, window: "1 m" },
  leads: { requests: 10, window: "1 m" },
};

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const memoryWindows = new Map<string, number[]>();
let upstashLimiters: Partial<Record<RateLimitBucket, Ratelimit>> | null = null;
let upstashInitAttempted = false;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  return "anonymous";
}

function parseWindowMs(window: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(window.trim());
  if (!match) return 60_000;
  const amount = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === "s" ? 1_000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return amount * mult;
}

function memoryLimit(
  key: string,
  requests: number,
  windowMs: number,
): LimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (memoryWindows.get(key) ?? []).filter((ts) => ts > cutoff);

  if (hits.length >= requests) {
    const oldest = hits[0] ?? now;
    memoryWindows.set(key, hits);
    return {
      success: false,
      limit: requests,
      remaining: 0,
      reset: oldest + windowMs,
    };
  }

  hits.push(now);
  memoryWindows.set(key, hits);
  return {
    success: true,
    limit: requests,
    remaining: Math.max(0, requests - hits.length),
    reset: now + windowMs,
  };
}

/** Test-only: clear in-memory counters. */
export function resetMemoryRateLimitsForTests(): void {
  memoryWindows.clear();
}

function getUpstashLimiter(bucket: RateLimitBucket): Ratelimit | null {
  if (upstashInitAttempted) {
    return upstashLimiters?.[bucket] ?? null;
  }

  upstashInitAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    upstashLimiters = {};
    return null;
  }

  try {
    const redis = new Redis({ url, token });
    upstashLimiters = {};
    for (const [name, config] of Object.entries(BUCKET_CONFIG) as [
      RateLimitBucket,
      (typeof BUCKET_CONFIG)[RateLimitBucket],
    ][]) {
      upstashLimiters[name] = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `closeloop:${name}`,
        analytics: false,
      });
    }
    return upstashLimiters[bucket] ?? null;
  } catch {
    upstashLimiters = {};
    return null;
  }
}

async function checkLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<LimitResult> {
  const config = BUCKET_CONFIG[bucket];
  const key = `${bucket}:${identifier}`;
  const upstash = getUpstashLimiter(bucket);

  if (upstash) {
    const result = await upstash.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  return memoryLimit(key, config.requests, parseWindowMs(config.window));
}

/**
 * Enforce rate limit for a request. Returns a 429 Response when exceeded,
 * otherwise null so the route can continue.
 */
export async function enforceRateLimit(
  request: Request,
  bucket: RateLimitBucket,
): Promise<Response | null> {
  const identifier = getClientIp(request);
  const result = await checkLimit(bucket, identifier);

  if (result.success) {
    return null;
  }

  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );

  return Response.json(
    {
      error: "Too many requests. Please wait a moment and try again.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}

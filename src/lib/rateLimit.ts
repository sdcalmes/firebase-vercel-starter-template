import { NextResponse } from "next/server";
import { rateLimitConfig, type RateLimitKey } from "./rateLimitConfig";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback for local dev (no Redis available).
const memoryStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now >= entry.resetAt) memoryStore.delete(key);
  }
}, 60_000);

function rateLimitInMemory(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): NextResponse | null {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) },
      }
    );
  }
  return null;
}

let upstashRedis: import("@upstash/redis").Redis | null = null;
let upstashInitialized = false;

function getUpstashRedis(): import("@upstash/redis").Redis | null {
  if (upstashInitialized) return upstashRedis;
  upstashInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  upstashRedis = new Redis({ url, token });
  return upstashRedis;
}

const rateLimiterCache = new Map<string, import("@upstash/ratelimit").Ratelimit>();

function getUpstashRateLimiter(
  limit: number,
  windowMs: number
): import("@upstash/ratelimit").Ratelimit | null {
  const redis = getUpstashRedis();
  if (!redis) return null;

  const cacheKey = `${limit}:${windowMs}`;
  const cached = rateLimiterCache.get(cacheKey);
  if (cached) return cached;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Ratelimit } = require("@upstash/ratelimit") as typeof import("@upstash/ratelimit");
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
    prefix: "rl",
  });
  rateLimiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Rate limiter that uses Upstash Redis in production (persists across serverless
 * instances) and falls back to in-memory for local dev.
 *
 * Returns a 429 NextResponse if the limit is exceeded, or null if allowed.
 *
 *   const rl = await rateLimit("mutation-standard", uid);
 *   if (rl) return rl;
 */
export async function rateLimit(
  keyOrName: RateLimitKey,
  uid: string,
): Promise<NextResponse | null>;
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<NextResponse | null>;
export async function rateLimit(
  keyOrName: string,
  uidOrOpts: string | { limit: number; windowMs: number },
): Promise<NextResponse | null> {
  let key: string;
  let limit: number;
  let windowMs: number;

  if (typeof uidOrOpts === "string") {
    const rule = rateLimitConfig[keyOrName as RateLimitKey];
    key = `${keyOrName}:${uidOrOpts}`;
    limit = rule.limit;
    windowMs = rule.windowMs;
  } else {
    key = keyOrName;
    limit = uidOrOpts.limit;
    windowMs = uidOrOpts.windowMs;
  }

  const limiter = getUpstashRateLimiter(limit, windowMs);
  if (!limiter) return rateLimitInMemory(key, { limit, windowMs });

  try {
    const result = await limiter.limit(key);
    if (!result.success) {
      const retryAfterMs = result.reset - Date.now();
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(Math.max(retryAfterMs, 1000) / 1000)) },
        }
      );
    }
    return null;
  } catch {
    return rateLimitInMemory(key, { limit, windowMs });
  }
}

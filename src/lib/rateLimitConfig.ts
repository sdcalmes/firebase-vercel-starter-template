/**
 * Centralized rate limit configuration for API routes.
 *
 * Limits are per-user (keyed by UID) using a fixed time window.
 * Add your own keys here, then call rateLimit("your-key", uid) in the route.
 */

export interface RateLimitRule {
  limit: number;      // max requests per window
  windowMs: number;   // window length in ms
}

const WINDOWS = {
  "1m": 60_000,
  "1h": 3_600_000,
} as const;

export const rateLimitConfig = {
  // Example tiers — replace with your own keys.
  "mutation-strict":   { limit: 5,  windowMs: WINDOWS["1m"] },
  "mutation-standard": { limit: 10, windowMs: WINDOWS["1m"] },
  "read-standard":     { limit: 30, windowMs: WINDOWS["1m"] },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitKey = keyof typeof rateLimitConfig;

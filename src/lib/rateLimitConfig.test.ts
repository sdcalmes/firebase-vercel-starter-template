import { describe, it, expect } from 'vitest';
import { rateLimitConfig, type RateLimitKey } from '@/lib/rateLimitConfig';

describe('rateLimitConfig', () => {
  it('defines positive limits and windows for every rule', () => {
    const entries = Object.entries(rateLimitConfig) as [RateLimitKey, typeof rateLimitConfig[RateLimitKey]][];
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, rule] of entries) {
      expect(rule.limit, `${key}.limit`).toBeGreaterThan(0);
      expect(rule.windowMs, `${key}.windowMs`).toBeGreaterThan(0);
    }
  });

  it('keeps stricter tiers at or below looser tiers within the same window', () => {
    const { 'mutation-strict': strict, 'mutation-standard': standard } = rateLimitConfig;
    expect(strict.windowMs).toBe(standard.windowMs);
    expect(strict.limit).toBeLessThanOrEqual(standard.limit);
  });
});

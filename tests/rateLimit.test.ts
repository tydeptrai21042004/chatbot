import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../src/server/utils/rateLimit";

describe("rate limiter", () => {
  it("allows requests up to the limit and rejects the next one", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 2, 10_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 10_000).ok).toBe(true);
    const blocked = checkRateLimit(key, 2, 10_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("keeps independent buckets for different identities", () => {
    const a = `a-${crypto.randomUUID()}`;
    const b = `b-${crypto.randomUUID()}`;
    expect(checkRateLimit(a, 1, 10_000).ok).toBe(true);
    expect(checkRateLimit(a, 1, 10_000).ok).toBe(false);
    expect(checkRateLimit(b, 1, 10_000).ok).toBe(true);
  });

  it("resets after the configured window", async () => {
    const key = `reset-${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 1, 5).ok).toBe(true);
    expect(checkRateLimit(key, 1, 5).ok).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 8));
    expect(checkRateLimit(key, 1, 5).ok).toBe(true);
  });
});

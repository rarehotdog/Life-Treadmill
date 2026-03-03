import { describe, expect, it } from "vitest";

import { MAX_RETRY_ATTEMPTS, getRetryBackoffMinutes, isRetryAttemptDead } from "@/lib/analytics-retry";

describe("analytics retry policy", () => {
  it("applies exponential backoff schedule", () => {
    expect(getRetryBackoffMinutes(1)).toBe(1);
    expect(getRetryBackoffMinutes(2)).toBe(5);
    expect(getRetryBackoffMinutes(3)).toBe(15);
    expect(getRetryBackoffMinutes(4)).toBe(60);
    expect(getRetryBackoffMinutes(5)).toBe(360);
  });

  it("clamps invalid attempt values to safe bounds", () => {
    expect(getRetryBackoffMinutes(0)).toBe(1);
    expect(getRetryBackoffMinutes(-1)).toBe(1);
    expect(getRetryBackoffMinutes(99)).toBe(360);
  });

  it("marks queue jobs as dead at max attempts", () => {
    expect(isRetryAttemptDead(MAX_RETRY_ATTEMPTS - 1)).toBe(false);
    expect(isRetryAttemptDead(MAX_RETRY_ATTEMPTS)).toBe(true);
    expect(isRetryAttemptDead(MAX_RETRY_ATTEMPTS + 1)).toBe(true);
  });
});

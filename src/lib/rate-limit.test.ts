import { afterEach, describe, expect, it } from "vitest";
import {
  enforceRateLimit,
  resetMemoryRateLimitsForTests,
} from "@/lib/rate-limit";

describe("enforceRateLimit", () => {
  afterEach(() => {
    resetMemoryRateLimitsForTests();
  });

  it("allows requests under the limit", async () => {
    const request = new Request("http://localhost/api/leads", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    const blocked = await enforceRateLimit(request, "leads");
    expect(blocked).toBeNull();
  });

  it("returns 429 after the leads bucket is exhausted", async () => {
    const ip = "203.0.113.99";
    let last: Response | null = null;

    for (let i = 0; i < 12; i += 1) {
      last = await enforceRateLimit(
        new Request("http://localhost/api/leads", {
          headers: { "x-forwarded-for": ip },
        }),
        "leads",
      );
    }

    expect(last).not.toBeNull();
    expect(last?.status).toBe(429);
    const body = await last!.json();
    expect(body.code).toBe("RATE_LIMITED");
    expect(last?.headers.get("Retry-After")).toBeTruthy();
  });
});

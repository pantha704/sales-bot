import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertLiveN8nConfig,
  EnvConfigError,
  getProviderAvailability,
  getServerEnv,
} from "@/lib/env";

describe("getServerEnv / assertLiveN8nConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows demo mode with empty optional credentials", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("N8N_LEAD_WEBHOOK_URL", "");
    vi.stubEnv("N8N_WEBHOOK_SECRET", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const env = getServerEnv();
    expect(env.GROQ_API_KEY).toBeUndefined();
    expect(env.N8N_LEAD_WEBHOOK_URL).toBeUndefined();
    expect(getProviderAvailability().rateLimitBackend).toBe("memory");
  });

  it("fails closed when n8n webhook URL is set without a secret", () => {
    vi.stubEnv(
      "N8N_LEAD_WEBHOOK_URL",
      "https://example.n8n.cloud/webhook/eubrics-lead-profiler",
    );
    vi.stubEnv("N8N_WEBHOOK_SECRET", "");

    expect(() => assertLiveN8nConfig(getServerEnv())).toThrow(EnvConfigError);
    expect(getProviderAvailability().n8n).toBe(false);
  });

  it("accepts n8n when both URL and secret are set", () => {
    vi.stubEnv(
      "N8N_LEAD_WEBHOOK_URL",
      "https://example.n8n.cloud/webhook/eubrics-lead-profiler",
    );
    vi.stubEnv("N8N_WEBHOOK_SECRET", "shared-secret");

    const live = assertLiveN8nConfig(getServerEnv());
    expect(live.webhookUrl).toContain("n8n.cloud");
    expect(live.webhookSecret).toBe("shared-secret");
    expect(getProviderAvailability().n8n).toBe(true);
  });
});

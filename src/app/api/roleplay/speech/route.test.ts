import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPersona } from "@/features/roleplay/personas";
import { POST } from "@/app/api/roleplay/speech/route";

describe("POST /api/roleplay/speech", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid request", async () => {
    const response = await POST(
      new Request("http://localhost/api/roleplay/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("selects the browser fallback when cloud TTS is disabled", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("NEUPHONIC_API_KEY", "");
    vi.stubEnv("TTS_PROVIDER", "browser");
    const response = await POST(
      new Request("http://localhost/api/roleplay/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "What problem are you solving?",
          voice: defaultPersona.voice,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.fallback).toBe("browser");
  });
});


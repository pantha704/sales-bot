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

  it("selects the browser fallback when no cloud provider is configured", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("NEUPHONIC_API_KEY", "");
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

import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPersona } from "@/features/roleplay/personas";
import { POST } from "@/app/api/roleplay/respond/route";

describe("POST /api/roleplay/respond", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a deterministic mock reply for a valid request", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const request = new Request("http://localhost/api/roleplay/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: crypto.randomUUID(),
        persona: defaultPersona,
        messages: [],
        sellerMessage: "How important is data security to your team?",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("mock");
    expect(body.reply).toMatch(/data|customer|CRM/i);
  });

  it("returns structured validation errors", async () => {
    const request = new Request("http://localhost/api/roleplay/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerMessage: "" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid roleplay request.");
    expect(body.issues.length).toBeGreaterThan(0);
  });
});

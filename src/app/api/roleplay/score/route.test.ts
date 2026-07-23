import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/roleplay/score/route";
import { defaultPersona } from "@/features/roleplay/personas";

function message(
  role: "seller" | "buyer",
  content: string,
  index: number,
) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date(Date.now() + index * 1000).toISOString(),
  };
}

const validBody = {
  sessionId: crypto.randomUUID(),
  persona: defaultPersona,
  messages: [
    message("buyer", "What did you want to discuss?", 0),
    message(
      "seller",
      "What challenges do you face with sales ramp and coaching?",
      1,
    ),
    message("buyer", "Ramp time is painful.", 2),
    message(
      "seller",
      "How do you practice discovery today, and would a pilot help next quarter?",
      3,
    ),
  ],
};

describe("POST /api/roleplay/score", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a mock score without a Groq key", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const response = await POST(
      new Request("http://localhost/api/roleplay/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("mock");
    expect(body.dimensions).toHaveLength(5);
    expect(body.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("rejects short transcripts", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const response = await POST(
      new Request("http://localhost/api/roleplay/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validBody,
          messages: [
            message("buyer", "Hi", 0),
            message("seller", "Hello only once", 1),
          ],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("INSUFFICIENT_TRANSCRIPT");
  });
});

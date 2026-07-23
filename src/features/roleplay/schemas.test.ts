import { describe, expect, it } from "vitest";
import { defaultPersona } from "@/features/roleplay/personas";
import { conversationRequestSchema } from "@/features/roleplay/schemas";

describe("conversationRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = conversationRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      persona: defaultPersona,
      messages: [],
      sellerMessage: "What are you hoping to improve?",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty seller input", () => {
    const result = conversationRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      persona: defaultPersona,
      messages: [],
      sellerMessage: "  ",
    });

    expect(result.success).toBe(false);
  });
});

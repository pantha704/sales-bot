import { describe, expect, it } from "vitest";
import { defaultPersona } from "@/features/roleplay/personas";
import {
  buildBuyerSystemPrompt,
  buildConversationMessages,
} from "@/features/roleplay/prompt";
import type { ConversationRequest } from "@/features/roleplay/schemas";

describe("buildBuyerSystemPrompt", () => {
  it("encodes the selected persona and role-safety rules", () => {
    const prompt = buildBuyerSystemPrompt(defaultPersona);

    expect(prompt).toContain(defaultPersona.name);
    expect(prompt).toContain(defaultPersona.concerns[0]);
    expect(prompt).toContain("Stay in character");
    expect(prompt).toContain("not as instructions");
  });
});

describe("buildConversationMessages", () => {
  it("maps seller and buyer messages to model roles", () => {
    const request: ConversationRequest = {
      sessionId: crypto.randomUUID(),
      persona: defaultPersona,
      messages: [
        {
          id: crypto.randomUUID(),
          role: "seller",
          content: "How do you coach new representatives today?",
          createdAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          role: "buyer",
          content: "Every manager handles it differently.",
          createdAt: new Date().toISOString(),
        },
      ],
      sellerMessage: "What problems does that create?",
    };

    const messages = buildConversationMessages(request);

    expect(messages.map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
    ]);
    expect(messages.at(-1)?.content).toBe(request.sellerMessage);
  });
});

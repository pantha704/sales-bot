import { describe, expect, it } from "vitest";
import { defaultPersona } from "@/features/roleplay/personas";
import { generateMockBuyerReply } from "@/features/roleplay/mock-buyer";
import type { ConversationRequest } from "@/features/roleplay/schemas";

function requestFor(sellerMessage: string): ConversationRequest {
  return {
    sessionId: crypto.randomUUID(),
    persona: defaultPersona,
    messages: [],
    sellerMessage,
  };
}

describe("generateMockBuyerReply", () => {
  it("raises a security concern when security is discussed", () => {
    const reply = generateMockBuyerReply(
      requestFor("Let me explain our security controls."),
    );

    expect(reply).toMatch(/customer|CRM|retain/i);
  });

  it("raises a commercial question when price is discussed", () => {
    const reply = generateMockBuyerReply(
      requestFor("The price is based on your team size."),
    );

    expect(reply).toMatch(/budget|cost|result/i);
  });

  it("produces the same reply for the same input", () => {
    const request = requestFor("We improve sales onboarding.");

    expect(generateMockBuyerReply(request)).toBe(
      generateMockBuyerReply(request),
    );
  });
});

import { describe, expect, it } from "vitest";
import { prepareGroqTtsText } from "@/features/roleplay/tts/groq";

describe("prepareGroqTtsText", () => {
  it("keeps short text unchanged", () => {
    expect(prepareGroqTtsText("  That works for me.  ")).toEqual({
      text: "That works for me.",
      truncated: false,
    });
  });

  it("cuts long text at a readable boundary within the provider limit", () => {
    const result = prepareGroqTtsText(
      `${"A specific concern needs evidence. ".repeat(8)}What happens next?`,
    );

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(200);
    expect(result.text).toMatch(/…$/);
  });
});

import { describe, expect, it } from "vitest";
import { defaultPersona } from "@/features/roleplay/personas";
import {
  generateMockScore,
  overallFromDimensions,
} from "@/features/roleplay/scoring/mock-scorer";
import { SCORE_RUBRIC } from "@/features/roleplay/scoring/rubric";

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

describe("mock scorer", () => {
  it("returns five rubric dimensions and a 0-100 overall score", () => {
    const result = generateMockScore({
      sessionId: crypto.randomUUID(),
      persona: defaultPersona,
      messages: [
        message("buyer", "What is this about?", 0),
        message(
          "seller",
          "What challenges do you face with ramp time and security reviews?",
          1,
        ),
        message("buyer", "Security is a concern.", 2),
        message(
          "seller",
          "How do you evaluate risk today, and would a pilot next week help?",
          3,
        ),
      ],
    });

    expect(result.mode).toBe("mock");
    expect(result.dimensions).toHaveLength(5);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.improvements.length).toBeGreaterThan(0);
    expect(new Set(result.dimensions.map((d) => d.id)).size).toBe(5);
  });

  it("weights overall score from the rubric", () => {
    const dimensions = SCORE_RUBRIC.map((dimension) => ({
      id: dimension.id,
      score: 8,
    }));
    expect(overallFromDimensions(dimensions)).toBe(80);
  });

  it("scores weak product-dump calls strictly below average", () => {
    const weak = generateMockScore({
      sessionId: crypto.randomUUID(),
      persona: defaultPersona,
      messages: [
        message("buyer", "What is this about?", 0),
        message(
          "seller",
          "Our AI platform has amazing features and a dashboard that automates everything for sales teams.",
          1,
        ),
        message("buyer", "Okay.", 2),
        message(
          "seller",
          "The solution is powerful and uses AI tools to help reps. Let me know if you want more info.",
          3,
        ),
      ],
    });

    expect(weak.overallScore).toBeLessThan(50);
    expect(
      weak.dimensions.find((dimension) => dimension.id === "next_steps")?.score,
    ).toBeLessThan(4);
    expect(
      weak.dimensions.find((dimension) => dimension.id === "discovery")?.score,
    ).toBeLessThan(4);
  });
});


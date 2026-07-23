import { describe, expect, it } from "vitest";
import { toEdgeRate } from "@/features/roleplay/tts/edge";

describe("toEdgeRate", () => {
  it("maps persona rates to Edge relative percentages", () => {
    expect(toEdgeRate(1.0)).toBe("+0%");
    expect(toEdgeRate(1.06)).toBe("+8%");
    expect(toEdgeRate(0.96)).toBe("-8%");
    expect(toEdgeRate(1.15)).toBe("+15%");
    expect(toEdgeRate(0.85)).toBe("-15%");
  });
});

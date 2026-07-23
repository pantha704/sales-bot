import { describe, expect, it } from "vitest";
import { toEdgeRate } from "@/features/roleplay/tts/edge";

describe("toEdgeRate", () => {
  it("maps persona rates with a 1.2× speed boost", () => {
    // 1.0 * 1.2 → +20%
    expect(toEdgeRate(1.0)).toBe("+20%");
    // 1.06 * 1.2 → +27%
    expect(toEdgeRate(1.06)).toBe("+27%");
    // 0.96 * 1.2 → +15%
    expect(toEdgeRate(0.96)).toBe("+15%");
    // 0.85 * 1.2 → +2%
    expect(toEdgeRate(0.85)).toBe("+2%");
  });
});

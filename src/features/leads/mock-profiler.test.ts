import { describe, expect, it } from "vitest";
import { profileLeadLocally } from "@/features/leads/mock-profiler";

describe("profileLeadLocally", () => {
  it("recognizes an organizational development lead", () => {
    expect(
      profileLeadLocally({
        name: "Priya Shah",
        email: "priya@example.com",
        company: "Acme",
        jobTitle: "People Director",
        query: "We need leadership coaching for our new managers.",
        pageHistory: ["/leadership-training", "/manager-development"],
      }).category,
    ).toBe("Organizational Development");
  });

  it("recognizes a sales bot lead", () => {
    expect(
      profileLeadLocally({
        name: "Alex Kim",
        email: "alex@example.com",
        company: "Acme",
        jobTitle: "Sales Enablement",
        query: "Can reps practice discovery calls with the AI roleplay bot?",
        pageHistory: ["/ai-sales-roleplays", "/sales-coaching"],
      }).category,
    ).toBe("Sales Bots");
  });
});

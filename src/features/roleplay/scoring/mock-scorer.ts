import type { ScoreRequest, ScoreResponse } from "@/features/roleplay/scoring/schemas";
import {
  SCORE_RUBRIC,
  type ScoreDimensionId,
} from "@/features/roleplay/scoring/rubric";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreDimensions(request: ScoreRequest) {
  const sellerTurns = request.messages.filter((message) => message.role === "seller");
  const buyerTurns = request.messages.filter((message) => message.role === "buyer");
  const sellerText = sellerTurns.map((message) => message.content).join(" ");
  const lower = sellerText.toLowerCase();

  const questionMarks = (sellerText.match(/\?/g) ?? []).length;
  const openers =
    (lower.match(/\b(what|how|why|when|who|where|tell me|walk me)\b/g) ?? [])
      .length;
  const objectionLang =
    (lower.match(
      /\b(challenge|concern|risk|budget|timeline|security|implement|adoption)\b/g,
    ) ?? []).length;
  const valueLang =
    (lower.match(
      /\b(roi|save|reduce|increase|pipeline|ramp|enable|coach|practice)\b/g,
    ) ?? []).length;
  const nextStepLang =
    (lower.match(
      /\b(next step|follow.?up|schedule|meeting|pilot|demo|call)\b/g,
    ) ?? []).length;

  const difficultyBias =
    request.persona.difficulty === "hard"
      ? 0.6
      : request.persona.difficulty === "easy"
        ? -0.3
        : 0;

  const byId: Record<ScoreDimensionId, { score: number; note: string }> = {
    discovery: {
      score: clamp(3 + questionMarks * 1.2 + openers * 0.4 + difficultyBias, 1, 9.5),
      note:
        questionMarks >= 2
          ? "Seller asked multiple discovery questions to surface buyer needs."
          : "Seller could ask more open questions to uncover goals and constraints.",
    },
    objections: {
      score: clamp(
        3.5 + objectionLang * 0.9 + (buyerTurns.length > 2 ? 0.8 : 0),
        1,
        9.5,
      ),
      note:
        objectionLang >= 1
          ? "Seller engaged topics that often become objections."
          : "Seller rarely acknowledged or explored likely objections.",
    },
    value: {
      score: clamp(3 + valueLang * 1.1 + sellerText.length / 900, 1, 9.5),
      note:
        valueLang >= 2
          ? "Seller used concrete value language tied to sales outcomes."
          : "Value claims stayed generic; more buyer-specific impact would help.",
    },
    structure: {
      score: clamp(4 + sellerTurns.length * 0.45, 2, 9),
      note:
        sellerTurns.length >= 3
          ? "Conversation had enough turns to show a developing structure."
          : "Call is still early; structure will become clearer with more turns.",
    },
    next_steps: {
      score: clamp(2.5 + nextStepLang * 2.2, 1, 9.5),
      note:
        nextStepLang >= 1
          ? "Seller introduced a follow-up or decision path."
          : "Seller has not yet proposed a clear next step.",
    },
  };

  return SCORE_RUBRIC.map((dimension) => ({
    id: dimension.id,
    label: dimension.label,
    score: Math.round(byId[dimension.id].score * 10) / 10,
    note: byId[dimension.id].note,
  }));
}

export function overallFromDimensions(
  dimensions: { score: number; id: ScoreDimensionId }[],
): number {
  let weighted = 0;
  for (const dimension of SCORE_RUBRIC) {
    const found = dimensions.find((item) => item.id === dimension.id);
    weighted += (found?.score ?? 0) * dimension.weight;
  }
  return Math.round(clamp(weighted * 10, 0, 100));
}

export function generateMockScore(request: ScoreRequest): ScoreResponse {
  const dimensions = scoreDimensions(request);
  const overallScore = overallFromDimensions(dimensions);
  const sellerCount = request.messages.filter((m) => m.role === "seller").length;

  return {
    mode: "mock",
    overallScore,
    dimensions,
    strengths: [
      sellerCount >= 3
        ? "Seller stayed in the conversation long enough to practice real discovery."
        : "Seller opened the dialogue and engaged the buyer.",
      dimensions.find((d) => d.id === "discovery")!.score >= 6
        ? "Discovery questions show intent to understand the buyer."
        : "Seller is beginning to establish a point of view with the buyer.",
    ].slice(0, 3),
    improvements: [
      dimensions.find((d) => d.id === "next_steps")!.score < 6
        ? "Close with a concrete next step once value is clear."
        : "Keep tightening the link between buyer pain and your offer.",
      dimensions.find((d) => d.id === "objections")!.score < 6
        ? "Name and explore objections before pitching features."
        : "Continue pressure-testing claims with buyer-specific evidence.",
    ].slice(0, 3),
    summary: `Demo scoring rates this call at ${overallScore}/100 against a fixed discovery rubric for a ${request.persona.difficulty} buyer.`,
    scoredAt: new Date().toISOString(),
  };
}

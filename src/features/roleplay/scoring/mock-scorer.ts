import type { ScoreRequest, ScoreResponse } from "@/features/roleplay/scoring/schemas";
import {
  SCORE_RUBRIC,
  type ScoreDimensionId,
} from "@/features/roleplay/scoring/rubric";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function countMatches(text: string, pattern: RegExp) {
  return (text.match(pattern) ?? []).length;
}

/**
 * Strict, evidence-based demo scorer.
 * Average weak discovery calls land ~25–45. Solid practice ~50–70.
 * 80+ requires real multi-signal evidence (not turn count alone).
 */
function scoreDimensions(request: ScoreRequest) {
  const sellerTurns = request.messages.filter((message) => message.role === "seller");
  const buyerTurns = request.messages.filter((message) => message.role === "buyer");
  const sellerText = sellerTurns.map((message) => message.content).join(" ");
  const lower = sellerText.toLowerCase();
  const avgLen =
    sellerTurns.length === 0
      ? 0
      : sellerText.length / Math.max(sellerTurns.length, 1);

  const questionMarks = countMatches(sellerText, /\?/g);
  const openQuestions = countMatches(
    lower,
    /\b(what|how|why|when|who|where|tell me|walk me through|help me understand)\b/g,
  );
  const goalProbe = countMatches(
    lower,
    /\b(goal|priority|metric|kpi|target|outcome|success|ramp|pipeline|quota)\b/g,
  );
  const constraintProbe = countMatches(
    lower,
    /\b(budget|timeline|security|compliance|integrat|crm|stakeholder|decision|criteria|risk)\b/g,
  );
  const objectionAck = countMatches(
    lower,
    /\b(concern|challenge|hesitat|worried|blocker|objection|pushback|fair|understand)\b/g,
  );
  const valueSpecific = countMatches(
    lower,
    /\b(roi|save|reduc(e|ing)|increase|cut|hours|%|percent|pipeline|ramp time|enablement|coach|practice|rep)\b/g,
  );
  const featureDump = countMatches(
    lower,
    /\b(feature|platform|ai|tool|solution|product|dashboard|automation)\b/g,
  );
  const nextStep = countMatches(
    lower,
    /\b(next step|follow[- ]?up|schedule|book|calendar|pilot|trial|demo|meeting|call next|this week|tomorrow)\b/g,
  );
  const buyerNameUsed = request.persona.name
    .toLowerCase()
    .split(/\s+/)
    .some((part) => part.length > 2 && lower.includes(part));
  const companyUsed = lower.includes(request.persona.company.toLowerCase());

  const difficultyPenalty =
    request.persona.difficulty === "hard"
      ? 1.1
      : request.persona.difficulty === "medium"
        ? 0.6
        : 0.2;

  // Discovery: requires real questions + probes, not just talking.
  const discoveryRaw =
    1.2 +
    Math.min(questionMarks, 4) * 0.7 +
    Math.min(openQuestions, 5) * 0.45 +
    Math.min(goalProbe, 3) * 0.55 +
    Math.min(constraintProbe, 3) * 0.5 +
    (buyerNameUsed || companyUsed ? 0.4 : 0) -
    difficultyPenalty -
    (questionMarks === 0 ? 1.5 : 0);

  // Objections: need acknowledge + explore, not feature spam.
  const objectionsRaw =
    1.0 +
    Math.min(objectionAck, 3) * 0.9 +
    Math.min(constraintProbe, 3) * 0.55 +
    (buyerTurns.length >= 3 ? 0.4 : 0) -
    Math.max(0, featureDump - valueSpecific) * 0.25 -
    difficultyPenalty;

  // Value: specific outcome language beats generic product talk.
  const valueRaw =
    1.0 +
    Math.min(valueSpecific, 4) * 0.85 +
    (goalProbe > 0 && valueSpecific > 0 ? 0.8 : 0) +
    (companyUsed ? 0.35 : 0) -
    Math.max(0, featureDump - valueSpecific - 1) * 0.35 -
    difficultyPenalty * 0.7 -
    (valueSpecific === 0 ? 1.2 : 0);

  // Structure: slight credit for multi-turn, but rambling/long monologues hurt.
  const structureRaw =
    1.5 +
    Math.min(sellerTurns.length, 6) * 0.35 +
    (questionMarks >= 2 ? 0.8 : 0) +
    (avgLen > 40 && avgLen < 280 ? 0.6 : 0) -
    (avgLen > 420 ? 1.2 : 0) -
    (sellerTurns.length <= 1 ? 1.0 : 0) -
    difficultyPenalty * 0.4;

  // Next steps: almost zero without an explicit ask.
  const nextStepsRaw =
    0.6 +
    Math.min(nextStep, 3) * 1.6 +
    (nextStep > 0 && valueSpecific > 0 ? 0.7 : 0) -
    (nextStep === 0 ? 1.8 : 0) -
    difficultyPenalty * 0.5;

  const byId: Record<ScoreDimensionId, { score: number; note: string }> = {
    discovery: {
      score: clamp(discoveryRaw, 0.5, 8.5),
      note:
        questionMarks >= 3 && (goalProbe > 0 || constraintProbe > 0)
          ? "Seller used multiple open questions and probed goals or constraints."
          : questionMarks >= 1
            ? "Some questions appeared, but discovery stayed shallow for this buyer."
            : "Little real discovery — mostly statements instead of open questions.",
    },
    objections: {
      score: clamp(objectionsRaw, 0.5, 8.5),
      note:
        objectionAck >= 2 && constraintProbe >= 1
          ? "Seller named concerns and stayed with them instead of skipping past."
          : objectionAck >= 1
            ? "Objections were lightly touched; more probing would earn trust."
            : "Likely objections were mostly ignored or answered with product talk.",
    },
    value: {
      score: clamp(valueRaw, 0.5, 8.5),
      note:
        valueSpecific >= 2 && goalProbe > 0
          ? "Value was tied to outcomes the buyer would care about."
          : valueSpecific >= 1
            ? "Some value language, but still too generic for this persona."
            : "Claims stayed product-centric with weak buyer-specific impact.",
    },
    structure: {
      score: clamp(structureRaw, 0.5, 8.2),
      note:
        sellerTurns.length >= 4 && questionMarks >= 2 && avgLen < 320
          ? "Call has a usable open → explore rhythm without long monologues."
          : sellerTurns.length >= 3
            ? "Enough turns for structure, but flow is still uneven."
            : "Too early or too monologue-heavy to show disciplined call structure.",
    },
    next_steps: {
      score: clamp(nextStepsRaw, 0.3, 8.5),
      note:
        nextStep >= 1
          ? "Seller proposed a concrete follow-up or decision path."
          : "No clear next step — the call ends without a committed action.",
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
  // Soft curve so mediocre dimension averages do not look “fine”.
  const overall = weighted * 10;
  const curved = overall < 55 ? overall * 0.92 : overall;
  return Math.round(clamp(curved, 0, 100));
}

export function generateMockScore(request: ScoreRequest): ScoreResponse {
  const dimensions = scoreDimensions(request);
  const overallScore = overallFromDimensions(dimensions);
  const weak = dimensions
    .filter((dimension) => dimension.score < 5)
    .map((dimension) => dimension.label);

  const strengths = dimensions
    .filter((dimension) => dimension.score >= 5.5)
    .slice(0, 2)
    .map((dimension) => `${dimension.label}: ${dimension.note}`);

  const improvements = dimensions
    .filter((dimension) => dimension.score < 6)
    .slice(0, 3)
    .map((dimension) => `${dimension.label}: ${dimension.note}`);

  return {
    mode: "mock",
    overallScore,
    dimensions,
    strengths:
      strengths.length > 0
        ? strengths
        : [
            "Seller entered the conversation, but evidence of strong sales craft is still thin.",
          ],
    improvements:
      improvements.length > 0
        ? improvements
        : [
            "Raise the bar with buyer-specific discovery, objection work, and a hard next step.",
          ],
    summary:
      overallScore >= 70
        ? `Strict demo rubric rates this ${overallScore}/100 — solid craft for a ${request.persona.difficulty} buyer.`
        : overallScore >= 45
          ? `Strict demo rubric rates this ${overallScore}/100. Partial progress; weak on ${weak.slice(0, 2).join(" and ") || "depth"}.`
          : `Strict demo rubric rates this ${overallScore}/100. Below a credible discovery standard for a ${request.persona.difficulty} buyer.`,
    scoredAt: new Date().toISOString(),
  };
}

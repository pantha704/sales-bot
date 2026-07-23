import type { ScoreRequest } from "@/features/roleplay/scoring/schemas";
import { SCORE_RUBRIC } from "@/features/roleplay/scoring/rubric";

function formatTranscript(request: ScoreRequest): string {
  return request.messages
    .map((message) => {
      const speaker =
        message.role === "seller" ? "Seller" : `Buyer (${request.persona.name})`;
      return `${speaker}: ${message.content}`;
    })
    .join("\n");
}

export function buildScoreSystemPrompt(): string {
  const dimensions = SCORE_RUBRIC.map(
    (dimension) =>
      `- ${dimension.id} (${dimension.label}, weight ${dimension.weight}): ${dimension.guide}`,
  ).join("\n");

  return `You are a senior sales enablement coach grading a discovery roleplay. Score ONLY the seller. The buyer is an AI prospect — never score the buyer.

Be STRICT and realistic. This is coaching, not encouragement theater.

Calibration (overall after weighting, approximate):
- 0–35: weak / product dump / no discovery
- 36–55: partial effort, missing core craft
- 56–72: competent practice call
- 73–84: strong; would impress a manager
- 85–100: rare excellence — only if transcript clearly earns it

Default bias: average practice calls should land in the 40s–60s. Do not inflate.

Return valid JSON only with this exact shape:
{
  "dimensions": [
    { "id": "discovery", "score": 0-10, "note": "one specific sentence citing evidence" },
    { "id": "objections", "score": 0-10, "note": "one specific sentence citing evidence" },
    { "id": "value", "score": 0-10, "note": "one specific sentence citing evidence" },
    { "id": "structure", "score": 0-10, "note": "one specific sentence citing evidence" },
    { "id": "next_steps", "score": 0-10, "note": "one specific sentence citing evidence" }
  ],
  "strengths": ["2-3 short bullets grounded in transcript"],
  "improvements": ["2-4 short bullets grounded in transcript"],
  "summary": "one or two honest sentences overall"
}

Hard rules:
- Include every dimension id exactly once.
- Scores are numbers from 0 to 10 (decimals allowed).
- Cap any dimension at 7.5 unless the transcript shows clear, repeated evidence.
- Cap any dimension at 8.5 unless the seller would pass a real manager review on that skill.
- No free points for "being polite" or "having a long call" alone.
- If the seller never asked open questions, discovery ≤ 4.
- If the seller never proposed a concrete next step, next_steps ≤ 3.5.
- If value is generic product talk with no buyer context, value ≤ 4.5.
- Harder buyers deserve slightly lower scores for the same craft.
- Notes must reference what happened (or did not happen) in the transcript.
- No markdown, no extra keys.

Rubric:
${dimensions}`;
}

export function buildScoreUserPrompt(request: ScoreRequest): string {
  const { persona } = request;
  const sellerTurns = request.messages.filter((m) => m.role === "seller").length;
  return `Buyer configuration:
- Name/role: ${persona.name}, ${persona.buyerRole} at ${persona.company}
- Industry: ${persona.industry}
- Difficulty: ${persona.difficulty}
- Personality: ${persona.personality}
- Goals: ${persona.goals.join("; ")}
- Likely objections: ${persona.concerns.join("; ")}
- Context: ${persona.context}
- Seller turns in transcript: ${sellerTurns}

Grade strictly. Cite seller behavior, not buyer personality.

Transcript:
${formatTranscript(request)}`;
}

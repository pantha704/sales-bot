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

  return `You are a sales coach scoring a discovery roleplay. Score only the seller. The buyer is an AI prospect — do not score the buyer.

Return valid JSON only with this exact shape:
{
  "dimensions": [
    { "id": "discovery", "score": 0-10, "note": "one specific sentence" },
    { "id": "objections", "score": 0-10, "note": "one specific sentence" },
    { "id": "value", "score": 0-10, "note": "one specific sentence" },
    { "id": "structure", "score": 0-10, "note": "one specific sentence" },
    { "id": "next_steps", "score": 0-10, "note": "one specific sentence" }
  ],
  "strengths": ["2-4 short bullets"],
  "improvements": ["2-4 short bullets"],
  "summary": "one or two sentences overall"
}

Rules:
- Include every dimension id exactly once.
- Scores are numbers from 0 to 10 (decimals allowed).
- Be specific and evidence-based from the transcript.
- No markdown, no extra keys.
- Harder buyers can still yield high scores when the seller earns progress.

Rubric:
${dimensions}`;
}

export function buildScoreUserPrompt(request: ScoreRequest): string {
  const { persona } = request;
  return `Buyer configuration:
- Name/role: ${persona.name}, ${persona.buyerRole} at ${persona.company}
- Industry: ${persona.industry}
- Difficulty: ${persona.difficulty}
- Personality: ${persona.personality}
- Context: ${persona.context}

Transcript:
${formatTranscript(request)}`;
}

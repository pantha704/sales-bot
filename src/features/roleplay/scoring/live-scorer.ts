import "server-only";

import { z } from "zod";
import {
  buildScoreSystemPrompt,
  buildScoreUserPrompt,
} from "@/features/roleplay/scoring/build-score-prompt";
import { overallFromDimensions } from "@/features/roleplay/scoring/mock-scorer";
import { SCORE_RUBRIC } from "@/features/roleplay/scoring/rubric";
import type {
  ScoreRequest,
  ScoreResponse,
} from "@/features/roleplay/scoring/schemas";
import { SCORE_DIMENSION_IDS } from "@/features/roleplay/scoring/rubric";
import { getServerEnv } from "@/lib/env";
import { getGroqClient } from "@/lib/groq";

const modelScoreSchema = z.object({
  dimensions: z
    .array(
      z.object({
        id: z.enum(SCORE_DIMENSION_IDS),
        score: z.number().min(0).max(10),
        note: z.string().trim().min(5).max(400),
      }),
    )
    .min(5)
    .max(5),
  strengths: z.array(z.string().trim().min(5).max(220)).min(1).max(4),
  improvements: z.array(z.string().trim().min(5).max(220)).min(1).max(4),
  summary: z.string().trim().min(10).max(500),
});

function normalizeDimensions(
  raw: z.infer<typeof modelScoreSchema>["dimensions"],
): ScoreResponse["dimensions"] {
  const byId = new Map(raw.map((item) => [item.id, item]));

  return SCORE_RUBRIC.map((dimension) => {
    const found = byId.get(dimension.id);
    if (!found) {
      throw new Error(`Missing score dimension: ${dimension.id}`);
    }
    return {
      id: dimension.id,
      label: dimension.label,
      score: Math.round(found.score * 10) / 10,
      note: found.note,
    };
  });
}

export async function generateLiveScore(
  request: ScoreRequest,
): Promise<ScoreResponse> {
  const env = getServerEnv();
  const completion = await getGroqClient().chat.completions.create({
    model: env.GROQ_CHAT_MODEL,
    temperature: 0.15,
    max_completion_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildScoreSystemPrompt() },
      { role: "user", content: buildScoreUserPrompt(request) },
    ],
  });

  const content = completion.choices[0]?.message.content?.trim();
  if (!content) {
    throw new Error("The scoring model returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("The scoring model returned invalid JSON.");
  }

  const modelScore = modelScoreSchema.parse(parsedJson);
  const dimensions = normalizeDimensions(modelScore.dimensions);

  return {
    mode: "live",
    overallScore: overallFromDimensions(dimensions),
    dimensions,
    strengths: modelScore.strengths.slice(0, 4),
    improvements: modelScore.improvements.slice(0, 4),
    summary: modelScore.summary,
    scoredAt: new Date().toISOString(),
  };
}

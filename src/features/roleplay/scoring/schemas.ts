import { z } from "zod";
import { personaSchema, roleplayMessageSchema } from "@/features/roleplay/schemas";
import { SCORE_DIMENSION_IDS } from "@/features/roleplay/scoring/rubric";

export const scoreDimensionResultSchema = z.object({
  id: z.enum(SCORE_DIMENSION_IDS),
  label: z.string().min(2).max(80),
  score: z.number().min(0).max(10),
  note: z.string().trim().min(5).max(400),
});

export const scoreRequestSchema = z.object({
  sessionId: z.string().uuid(),
  persona: personaSchema,
  messages: z.array(roleplayMessageSchema).min(2).max(40),
});

export const scoreResponseSchema = z.object({
  mode: z.enum(["live", "mock"]),
  overallScore: z.number().min(0).max(100),
  dimensions: z.array(scoreDimensionResultSchema).length(5),
  strengths: z.array(z.string().trim().min(5).max(220)).min(1).max(4),
  improvements: z.array(z.string().trim().min(5).max(220)).min(1).max(4),
  summary: z.string().trim().min(10).max(500),
  scoredAt: z.string().datetime(),
  fallbackReason: z.string().max(160).optional(),
});

export type ScoreRequest = z.infer<typeof scoreRequestSchema>;
export type ScoreResponse = z.infer<typeof scoreResponseSchema>;
export type ScoreDimensionResult = z.infer<typeof scoreDimensionResultSchema>;

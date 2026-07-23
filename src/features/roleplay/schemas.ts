import { z } from "zod";

export const difficultySchema = z.enum(["easy", "medium", "hard"]);

export const personaSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(60),
  buyerRole: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(80),
  industry: z.string().trim().min(2).max(80),
  personality: z.string().trim().min(2).max(120),
  difficulty: difficultySchema,
  goals: z.array(z.string().trim().min(2).max(120)).min(1).max(5),
  concerns: z.array(z.string().trim().min(2).max(120)).min(1).max(6),
  context: z.string().trim().min(10).max(600),
  voice: z.object({
    id: z.string().trim().min(1).max(120).optional(),
    style: z.string().trim().min(2).max(160),
    rate: z.number().min(0.8).max(1.2).default(1),
  }),
});

export const roleplayMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["seller", "buyer"]),
  content: z.string().trim().min(1).max(2_000),
  createdAt: z.string().datetime(),
});

export const conversationRequestSchema = z.object({
  sessionId: z.string().uuid(),
  persona: personaSchema,
  messages: z.array(roleplayMessageSchema).max(30),
  sellerMessage: z.string().trim().min(1).max(1_200),
});

export const conversationResponseSchema = z.object({
  turnId: z.string().uuid(),
  reply: z.string().trim().min(1).max(500),
  mode: z.enum(["live", "mock"]),
  fallbackReason: z.string().max(160).optional(),
});

export const speechRequestSchema = z.object({
  text: z.string().trim().min(1).max(1_000),
  voice: personaSchema.shape.voice,
});

export type Difficulty = z.infer<typeof difficultySchema>;
export type Persona = z.infer<typeof personaSchema>;
export type RoleplayMessage = z.infer<typeof roleplayMessageSchema>;
export type ConversationRequest = z.infer<typeof conversationRequestSchema>;
export type ConversationResponse = z.infer<typeof conversationResponseSchema>;
export type SpeechRequest = z.infer<typeof speechRequestSchema>;

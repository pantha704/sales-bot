import "server-only";

import { z } from "zod";

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.url().optional(),
);

const serverEnvSchema = z.object({
  GROQ_API_KEY: optionalString,
  GROQ_CHAT_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
  GROQ_TTS_VOICE: z.string().min(1).default("troy"),
  NEUPHONIC_API_KEY: optionalString,
  NEUPHONIC_VOICE_ID: optionalString,
  TTS_PROVIDER: z.enum(["neuphonic", "groq"]).default("neuphonic"),
  N8N_LEAD_WEBHOOK_URL: optionalUrl,
  N8N_WEBHOOK_SECRET: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_CHAT_MODEL: process.env.GROQ_CHAT_MODEL,
    GROQ_TTS_VOICE: process.env.GROQ_TTS_VOICE,
    NEUPHONIC_API_KEY: process.env.NEUPHONIC_API_KEY,
    NEUPHONIC_VOICE_ID: process.env.NEUPHONIC_VOICE_ID,
    TTS_PROVIDER: process.env.TTS_PROVIDER,
    N8N_LEAD_WEBHOOK_URL: process.env.N8N_LEAD_WEBHOOK_URL,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
  });
}

export function getProviderAvailability() {
  const env = getServerEnv();

  return {
    groq: Boolean(env.GROQ_API_KEY),
    neuphonic: Boolean(env.NEUPHONIC_API_KEY),
    n8n: Boolean(env.N8N_LEAD_WEBHOOK_URL),
    mockMode: !env.GROQ_API_KEY,
  } as const;
}

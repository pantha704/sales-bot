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
  /**
   * browser = free Web Speech API (client-side; speech route returns 503)
   * neuphonic = optional free/paid Neuphonic cloud TTS
   * groq = paid Orpheus (disabled unless explicitly selected)
   */
  TTS_PROVIDER: z.enum(["browser", "neuphonic", "groq"]).default("browser"),
  N8N_LEAD_WEBHOOK_URL: optionalUrl,
  N8N_WEBHOOK_SECRET: optionalString,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type EnvIssue = {
  path: PropertyKey[];
  message: string;
};

export class EnvConfigError extends Error {
  readonly issues: EnvIssue[];

  constructor(issues: EnvIssue[]) {
    super("Server environment configuration is invalid.");
    this.name = "EnvConfigError";
    this.issues = issues;
  }
}

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
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * Live n8n requires both URL and shared secret. Fail closed so we never
 * proxy leads to an unauthenticated webhook.
 */
export function assertLiveN8nConfig(env: ServerEnv): {
  webhookUrl: string;
  webhookSecret: string;
} {
  if (!env.N8N_LEAD_WEBHOOK_URL) {
    throw new EnvConfigError([
      {
        path: ["N8N_LEAD_WEBHOOK_URL"],
        message: "N8N_LEAD_WEBHOOK_URL is not configured.",
      },
    ]);
  }

  if (!env.N8N_WEBHOOK_SECRET) {
    throw new EnvConfigError([
      {
        path: ["N8N_WEBHOOK_SECRET"],
        message:
          "N8N_WEBHOOK_SECRET is required when N8N_LEAD_WEBHOOK_URL is set.",
      },
    ]);
  }

  return {
    webhookUrl: env.N8N_LEAD_WEBHOOK_URL,
    webhookSecret: env.N8N_WEBHOOK_SECRET,
  };
}

export function getProviderAvailability() {
  const env = getServerEnv();
  const upstashReady = Boolean(
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN,
  );

  return {
    groq: Boolean(env.GROQ_API_KEY),
    neuphonic: Boolean(env.NEUPHONIC_API_KEY),
    ttsProvider: env.TTS_PROVIDER,
    n8n: Boolean(env.N8N_LEAD_WEBHOOK_URL && env.N8N_WEBHOOK_SECRET),
    mockMode: !env.GROQ_API_KEY,
    rateLimitBackend: upstashReady ? ("upstash" as const) : ("memory" as const),
  } as const;
}

/** JSON 503 when env is misconfigured (e.g. webhook URL without secret). */
export function envConfigErrorResponse(error: unknown): Response | null {
  if (!(error instanceof EnvConfigError)) {
    return null;
  }

  return Response.json(
    {
      error:
        "Server configuration is incomplete. Contact the operator if this persists.",
      code: "ENV_MISCONFIGURED",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

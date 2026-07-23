import "server-only";

import Groq from "groq-sdk";
import { getServerEnv } from "@/lib/env";

let groqClient: Groq | null = null;
let clientApiKey: string | null = null;

export function getGroqClient(): Groq {
  const { GROQ_API_KEY } = getServerEnv();

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  if (!groqClient || clientApiKey !== GROQ_API_KEY) {
    groqClient = new Groq({
      apiKey: GROQ_API_KEY,
      maxRetries: 2,
      timeout: 20_000,
    });
    clientApiKey = GROQ_API_KEY;
  }

  return groqClient;
}

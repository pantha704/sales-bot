import "server-only";

import type {
  SynthesisInput,
  SynthesisResult,
} from "@/features/roleplay/tts/types";
import { getServerEnv } from "@/lib/env";
import { getGroqClient } from "@/lib/groq";

const GROQ_TTS_CHARACTER_LIMIT = 200;

/** Primary expressive model; PlayAI is a more widely enabled fallback. */
const GROQ_TTS_ATTEMPTS = [
  {
    model: "canopylabs/orpheus-v1-english",
    voiceEnv: true,
    defaultVoice: "troy",
  },
  {
    model: "playai-tts",
    voiceEnv: false,
    defaultVoice: "Fritz-PlayAI",
  },
] as const;

export function prepareGroqTtsText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= GROQ_TTS_CHARACTER_LIMIT) {
    return { text: normalized, truncated: false };
  }

  const candidate = normalized.slice(0, GROQ_TTS_CHARACTER_LIMIT - 1);
  const sentenceEnd = Math.max(
    candidate.lastIndexOf("."),
    candidate.lastIndexOf("?"),
    candidate.lastIndexOf("!"),
  );
  const wordEnd = candidate.lastIndexOf(" ");
  const cutAt =
    sentenceEnd >= 100
      ? sentenceEnd + 1
      : wordEnd >= 100
        ? wordEnd
        : candidate.length;

  return {
    text: `${candidate.slice(0, cutAt).trimEnd()}…`,
    truncated: true,
  };
}

export async function synthesizeWithGroq(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const env = getServerEnv();
  const prepared = prepareGroqTtsText(input.text);
  const client = getGroqClient();
  let lastError: unknown;

  for (const attempt of GROQ_TTS_ATTEMPTS) {
    const voice = attempt.voiceEnv
      ? env.GROQ_TTS_VOICE || attempt.defaultVoice
      : attempt.defaultVoice;

    try {
      const response = await client.audio.speech.create({
        model: attempt.model,
        voice,
        input: prepared.text,
        response_format: "wav",
        speed: input.voice.rate,
      });
      const audio = new Uint8Array(await response.arrayBuffer());

      if (audio.byteLength < 256) {
        throw new Error(
          `Groq ${attempt.model} returned empty audio (${audio.byteLength} bytes).`,
        );
      }

      return {
        audio,
        contentType: "audio/wav",
        provider: "groq",
        truncated: prepared.truncated,
      };
    } catch (error) {
      lastError = error;
      console.error("[tts:groq]", attempt.model, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Groq TTS could not generate audio.");
}

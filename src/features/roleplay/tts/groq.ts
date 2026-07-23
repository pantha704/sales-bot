import "server-only";

import type {
  SynthesisInput,
  SynthesisResult,
} from "@/features/roleplay/tts/types";
import { getServerEnv } from "@/lib/env";
import { getGroqClient } from "@/lib/groq";

const GROQ_TTS_CHARACTER_LIMIT = 200;
const GROQ_TTS_MODEL = "canopylabs/orpheus-v1-english";

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
  // Orpheus only accepts model/input/voice/response_format — no speed.
  const response = await getGroqClient().audio.speech.create({
    model: GROQ_TTS_MODEL,
    voice: env.GROQ_TTS_VOICE,
    input: prepared.text,
    response_format: "wav",
  });
  const audio = new Uint8Array(await response.arrayBuffer());

  if (audio.byteLength < 256) {
    throw new Error(
      `Groq TTS returned empty audio (${audio.byteLength} bytes).`,
    );
  }

  return {
    audio,
    contentType: "audio/wav",
    provider: "groq",
    truncated: prepared.truncated,
  };
}

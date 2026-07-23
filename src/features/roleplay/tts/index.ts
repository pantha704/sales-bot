import "server-only";

import { synthesizeWithGroq } from "@/features/roleplay/tts/groq";
import { synthesizeWithNeuphonic } from "@/features/roleplay/tts/neuphonic";
import type {
  SynthesisInput,
  SynthesisResult,
  TtsProviderName,
} from "@/features/roleplay/tts/types";
import { getServerEnv } from "@/lib/env";

export class TtsUnavailableError extends Error {
  constructor(message = "No text-to-speech provider is available.") {
    super(message);
    this.name = "TtsUnavailableError";
  }
}

export async function synthesizeSpeech(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const env = getServerEnv();
  const configured = {
    neuphonic: Boolean(env.NEUPHONIC_API_KEY),
    groq: Boolean(env.GROQ_API_KEY),
  } satisfies Record<TtsProviderName, boolean>;
  const order: TtsProviderName[] =
    env.TTS_PROVIDER === "neuphonic"
      ? ["neuphonic", "groq"]
      : ["groq", "neuphonic"];
  const providers = {
    neuphonic: synthesizeWithNeuphonic,
    groq: synthesizeWithGroq,
  } satisfies Record<
    TtsProviderName,
    (value: SynthesisInput) => Promise<SynthesisResult>
  >;
  let lastError: unknown;

  for (const provider of order) {
    if (!configured[provider]) {
      continue;
    }

    try {
      const result = await providers[provider](input);
      // Guard against providers that "succeed" with a silent/empty payload.
      if (!result.audio || result.audio.byteLength < 256) {
        throw new Error(
          `${provider} returned empty audio (${result.audio?.byteLength ?? 0} bytes).`,
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[tts] provider=${provider} failed`, error);
    }
  }

  if (lastError instanceof Error) {
    throw new TtsUnavailableError(
      `Configured text-to-speech providers could not generate audio: ${lastError.message}`,
    );
  }

  throw new TtsUnavailableError();
}

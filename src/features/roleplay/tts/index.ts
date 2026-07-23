import "server-only";

import { synthesizeWithEdge } from "@/features/roleplay/tts/edge";
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

type PreferredTts = "browser" | "edge" | "neuphonic" | "groq";

function providerOrder(preferred: PreferredTts): TtsProviderName[] {
  // Free Edge first by default. Paid Orpheus only when explicitly selected.
  if (preferred === "browser") {
    return [];
  }
  if (preferred === "edge") {
    return ["edge", "neuphonic"];
  }
  if (preferred === "neuphonic") {
    return ["neuphonic", "edge"];
  }
  return ["groq", "edge", "neuphonic"];
}

export async function synthesizeSpeech(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const env = getServerEnv();

  if (env.TTS_PROVIDER === "browser") {
    throw new TtsUnavailableError(
      "Cloud TTS is disabled (TTS_PROVIDER=browser). Use free browser speech.",
    );
  }

  const configured = {
    edge: true, // no API key; uses public Microsoft Edge read-aloud service
    neuphonic: Boolean(env.NEUPHONIC_API_KEY),
    groq: Boolean(env.GROQ_API_KEY) && env.TTS_PROVIDER === "groq",
  } satisfies Record<TtsProviderName, boolean>;

  const order = providerOrder(env.TTS_PROVIDER);
  const providers = {
    edge: synthesizeWithEdge,
    neuphonic: synthesizeWithNeuphonic,
    groq: synthesizeWithGroq,
  } satisfies Record<
    TtsProviderName,
    (value: SynthesisInput) => Promise<SynthesisResult>
  >;
  const errors: string[] = [];

  for (const provider of order) {
    if (!configured[provider]) {
      continue;
    }

    try {
      const result = await providers[provider](input);
      if (!result.audio || result.audio.byteLength < 256) {
        throw new Error(
          `${provider} returned empty audio (${result.audio?.byteLength ?? 0} bytes).`,
        );
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown");
      errors.push(`${provider}: ${message}`);
      console.error(`[tts] provider=${provider} failed`, error);
    }
  }

  if (errors.length > 0) {
    throw new TtsUnavailableError(
      `Configured text-to-speech providers could not generate audio. ${errors.join(" | ")}`,
    );
  }

  throw new TtsUnavailableError(
    "No cloud TTS is configured. Use browser speech fallback.",
  );
}

import "server-only";

import { toWav } from "@neuphonic/neuphonic-js";
import type {
  SynthesisInput,
  SynthesisResult,
} from "@/features/roleplay/tts/types";
import { getServerEnv } from "@/lib/env";

const NEUPHONIC_BASE_URL = "https://api.neuphonic.com";
const MIN_AUDIO_BYTES = 256;
/** Public default English voice from Neuphonic docs/examples. */
const DEFAULT_NEUPHONIC_VOICE_ID = "8e9c4bc8-3979-48ab-8626-df53befc2090";

type SseAudioChunk = {
  audio?: string;
  text?: string;
  sampling_rate?: number;
  stop?: boolean;
};

function decodeBase64Audio(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

/**
 * Parse Neuphonic SSE body. The official SDK uses EventSource and treats
 * stream end as "error", often resolving with empty audio on serverless.
 * A plain fetch + line parse is more reliable on Vercel.
 */
export function parseNeuphonicSseBody(body: string): {
  audio: Uint8Array;
  samplingRate: number;
  text: string;
} {
  const chunks: Uint8Array[] = [];
  let samplingRate = 0;
  let text = "";
  let total = 0;

  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") {
      continue;
    }

    let parsed: { data?: SseAudioChunk } | SseAudioChunk;
    try {
      parsed = JSON.parse(payload) as { data?: SseAudioChunk } | SseAudioChunk;
    } catch {
      continue;
    }

    const chunk =
      parsed && typeof parsed === "object" && "data" in parsed && parsed.data
        ? parsed.data
        : (parsed as SseAudioChunk);

    if (typeof chunk.audio === "string" && chunk.audio.length > 0) {
      const bytes = decodeBase64Audio(chunk.audio);
      chunks.push(bytes);
      total += bytes.byteLength;
    }

    if (typeof chunk.sampling_rate === "number" && chunk.sampling_rate > 0) {
      samplingRate = chunk.sampling_rate;
    }

    if (typeof chunk.text === "string") {
      text += chunk.text;
    }
  }

  const audio = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { audio, samplingRate, text };
}

async function requestNeuphonicSpeech(options: {
  apiKey: string;
  text: string;
  speed: number;
  voiceId?: string;
}): Promise<{ audio: Uint8Array; samplingRate: number; text: string }> {
  const url = new URL(`${NEUPHONIC_BASE_URL}/sse/speak/en`);
  url.searchParams.set("api_key", options.apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      text: options.text,
      speed: options.speed,
      lang_code: "en",
      sampling_rate: 24000,
      encoding: "pcm_linear",
      ...(options.voiceId ? { voice_id: options.voiceId } : {}),
    }),
    cache: "no-store",
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Neuphonic TTS failed (${response.status}): ${bodyText.slice(0, 200) || response.statusText}`,
    );
  }

  // Some error payloads still return HTTP 200 with JSON detail.
  if (bodyText.trimStart().startsWith("{") && !bodyText.includes("data:")) {
    throw new Error(`Neuphonic TTS invalid response: ${bodyText.slice(0, 200)}`);
  }

  const parsed = parseNeuphonicSseBody(bodyText);

  if (parsed.audio.byteLength < MIN_AUDIO_BYTES) {
    throw new Error(
      `Neuphonic returned empty audio (${parsed.audio.byteLength} bytes). bodyPreview=${bodyText.slice(0, 160)}`,
    );
  }

  return parsed;
}

export async function synthesizeWithNeuphonic(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const env = getServerEnv();

  if (!env.NEUPHONIC_API_KEY) {
    throw new Error("NEUPHONIC_API_KEY is not configured.");
  }

  const text = input.text.trim().endsWith("<STOP>")
    ? input.text.trim()
    : `${input.text.trim()}<STOP>`;

  const voiceCandidates = [
    input.voice.id,
    env.NEUPHONIC_VOICE_ID,
    DEFAULT_NEUPHONIC_VOICE_ID,
    undefined,
  ].filter((value, index, all) => all.indexOf(value) === index);

  let lastError: unknown;

  for (const voiceId of voiceCandidates) {
    try {
      const parsed = await requestNeuphonicSpeech({
        apiKey: env.NEUPHONIC_API_KEY,
        text,
        speed: Math.min(1.5, Math.max(0.7, input.voice.rate * 1.2)),
        voiceId,
      });
      const samplingRate =
        parsed.samplingRate > 0 ? parsed.samplingRate : 24000;

      return {
        audio: toWav(parsed.audio, samplingRate),
        contentType: "audio/wav",
        provider: "neuphonic",
      };
    } catch (error) {
      lastError = error;
      console.error("[tts:neuphonic]", voiceId ?? "default", error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Neuphonic TTS could not generate audio.");
}

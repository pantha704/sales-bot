import "server-only";

import { toWav } from "@neuphonic/neuphonic-js";
import type {
  SynthesisInput,
  SynthesisResult,
} from "@/features/roleplay/tts/types";
import { getServerEnv } from "@/lib/env";

const NEUPHONIC_BASE_URL = "https://api.neuphonic.com";
const MIN_AUDIO_BYTES = 256;

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

export async function synthesizeWithNeuphonic(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const env = getServerEnv();

  if (!env.NEUPHONIC_API_KEY) {
    throw new Error("NEUPHONIC_API_KEY is not configured.");
  }

  const voiceId = input.voice.id ?? env.NEUPHONIC_VOICE_ID;
  const text = input.text.trim().endsWith("<STOP>")
    ? input.text.trim()
    : `${input.text.trim()}<STOP>`;

  const url = new URL(`${NEUPHONIC_BASE_URL}/sse/speak/en`);
  url.searchParams.set("api_key", env.NEUPHONIC_API_KEY);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.NEUPHONIC_API_KEY,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      text,
      speed: input.voice.rate,
      lang_code: "en",
      sampling_rate: 24000,
      ...(voiceId ? { voice_id: voiceId } : {}),
    }),
    cache: "no-store",
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Neuphonic TTS failed (${response.status}): ${bodyText.slice(0, 200) || response.statusText}`,
    );
  }

  const parsed = parseNeuphonicSseBody(bodyText);

  if (parsed.audio.byteLength < MIN_AUDIO_BYTES) {
    throw new Error(
      `Neuphonic returned empty audio (${parsed.audio.byteLength} bytes).`,
    );
  }

  const samplingRate =
    parsed.samplingRate > 0 ? parsed.samplingRate : 24000;

  return {
    audio: toWav(parsed.audio, samplingRate),
    contentType: "audio/wav",
    provider: "neuphonic",
  };
}

import "server-only";

import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EdgeTTS } from "node-edge-tts";
import type {
  SynthesisInput,
  SynthesisResult,
} from "@/features/roleplay/tts/types";
import { getServerEnv } from "@/lib/env";

const DEFAULT_EDGE_VOICE = "en-US-AriaNeural";

/** Map persona rate (0.8–1.2) to Edge relative rate strings. */
export function toEdgeRate(rate: number): string {
  if (rate >= 1.12) return "+15%";
  if (rate >= 1.04) return "+8%";
  if (rate <= 0.88) return "-15%";
  if (rate <= 0.96) return "-8%";
  return "+0%";
}

export async function synthesizeWithEdge(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const env = getServerEnv();
  const voice =
    input.voice.id?.trim() ||
    env.EDGE_TTS_VOICE ||
    DEFAULT_EDGE_VOICE;
  const text = input.text.replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error("Edge TTS received empty text.");
  }

  const outPath = join(tmpdir(), `closeloop-edge-${randomUUID()}.mp3`);
  const tts = new EdgeTTS({
    voice,
    lang: "en-US",
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
    rate: toEdgeRate(input.voice.rate),
    timeout: 20_000,
  });

  try {
    await tts.ttsPromise(text, outPath);
    const audio = new Uint8Array(await readFile(outPath));

    if (audio.byteLength < 256) {
      throw new Error(`Edge TTS returned empty audio (${audio.byteLength} bytes).`);
    }

    return {
      audio,
      contentType: "audio/mpeg",
      provider: "edge",
    };
  } finally {
    await unlink(outPath).catch(() => undefined);
  }
}

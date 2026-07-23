import "server-only";

import { createClient, toWav } from "@neuphonic/neuphonic-js";
import type {
  SynthesisInput,
  SynthesisResult,
} from "@/features/roleplay/tts/types";
import { getServerEnv } from "@/lib/env";

export async function synthesizeWithNeuphonic(
  input: SynthesisInput,
): Promise<SynthesisResult> {
  const env = getServerEnv();

  if (!env.NEUPHONIC_API_KEY) {
    throw new Error("NEUPHONIC_API_KEY is not configured.");
  }

  const client = createClient({ apiKey: env.NEUPHONIC_API_KEY });
  const stream = await client.tts.sse({
    voice_id: input.voice.id ?? env.NEUPHONIC_VOICE_ID,
    speed: input.voice.rate,
    lang_code: "en",
    sampling_rate: 24000,
  });
  const response = await stream.send(`${input.text}<STOP>`);

  return {
    audio: toWav(response.audio, response.sampling_rate),
    contentType: "audio/wav",
    provider: "neuphonic",
  };
}

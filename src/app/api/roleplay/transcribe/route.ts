import { toFile } from "groq-sdk";
import { getServerEnv } from "@/lib/env";
import { getGroqClient } from "@/lib/groq";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const supportedAudioTypes = new Map([
  ["audio/webm", "webm"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/mp4", "mp4"],
  ["audio/ogg", "ogg"],
]);

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "roleplay-transcribe");
  if (limited) return limited;

  const formData = await request.formData().catch(() => null);
  const audio = formData?.get("audio");

  if (!(audio instanceof File)) {
    return errorResponse("Attach an audio recording in the audio field.", 400);
  }

  const extension = supportedAudioTypes.get(audio.type);

  if (!extension) {
    return errorResponse("Use WebM, WAV, MP3, MP4, or OGG audio.", 415);
  }

  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return errorResponse("Audio must be between 1 byte and 4 MB.", 413);
  }

  if (!getServerEnv().GROQ_API_KEY) {
    return errorResponse("Live transcription is not configured.", 503, {
      code: "TRANSCRIPTION_UNAVAILABLE",
    });
  }

  try {
    const upload = await toFile(
      new Uint8Array(await audio.arrayBuffer()),
      `roleplay-recording.${extension}`,
      { type: audio.type },
    );
    const transcription = await getGroqClient().audio.transcriptions.create({
      model: "whisper-large-v3-turbo",
      file: upload,
      language: "en",
      response_format: "json",
      temperature: 0,
    });
    const text = transcription.text.trim();

    if (!text) {
      return errorResponse("No speech was detected. Please try again.", 422);
    }

    return Response.json(
      { text },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(safeErrorMessage(error), 502, {
      code: "TRANSCRIPTION_FAILED",
    });
  }
}

function errorResponse(
  error: string,
  status: number,
  details: Record<string, string> = {},
) {
  return Response.json(
    { error, ...details },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

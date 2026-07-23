import { speechRequestSchema } from "@/features/roleplay/schemas";
import {
  synthesizeSpeech,
  TtsUnavailableError,
} from "@/features/roleplay/tts";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "roleplay-speech");
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = speechRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid speech request." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const result = await synthesizeSpeech(parsed.data);
    const audio = new Blob([result.audio], { type: result.contentType });

    return new Response(audio, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": result.contentType,
        "X-TTS-Provider": result.provider,
        "X-TTS-Truncated": String(Boolean(result.truncated)),
      },
    });
  } catch (error) {
    const unavailable = error instanceof TtsUnavailableError;
    console.error("[api/roleplay/speech]", error);

    return Response.json(
      {
        error: unavailable
          ? "Cloud speech is unavailable; use the browser voice fallback."
          : safeErrorMessage(error),
        fallback: "browser",
        // Helps diagnose provider failures without exposing secrets.
        detail:
          error instanceof Error
            ? error.message.replace(/api[_-]?key[=:][^\s&,]+/gi, "api_key=***")
            : undefined,
      },
      {
        status: unavailable ? 503 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

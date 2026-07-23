import { generateLiveScore } from "@/features/roleplay/scoring/live-scorer";
import { generateMockScore } from "@/features/roleplay/scoring/mock-scorer";
import {
  MIN_SELLER_TURNS_TO_SCORE,
} from "@/features/roleplay/scoring/rubric";
import {
  scoreRequestSchema,
  scoreResponseSchema,
} from "@/features/roleplay/scoring/schemas";
import { getServerEnv } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "roleplay-score");
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = scoreRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid scoring request.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const sellerTurns = parsed.data.messages.filter(
    (message) => message.role === "seller",
  ).length;

  if (sellerTurns < MIN_SELLER_TURNS_TO_SCORE) {
    return Response.json(
      {
        error: `Add at least ${MIN_SELLER_TURNS_TO_SCORE} seller turns before scoring.`,
        code: "INSUFFICIENT_TRANSCRIPT",
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (!getServerEnv().GROQ_API_KEY) {
    return jsonScore(generateMockScore(parsed.data));
  }

  try {
    return jsonScore(await generateLiveScore(parsed.data));
  } catch (error) {
    const mock = generateMockScore(parsed.data);
    return jsonScore({
      ...mock,
      fallbackReason: safeErrorMessage(error),
    });
  }
}

function jsonScore(score: ReturnType<typeof generateMockScore>) {
  const validated = scoreResponseSchema.parse(score);
  return Response.json(validated, {
    headers: { "Cache-Control": "no-store" },
  });
}

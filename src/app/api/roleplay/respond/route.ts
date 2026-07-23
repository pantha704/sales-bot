import { generateLiveBuyerReply } from "@/features/roleplay/live-buyer";
import { conversationRequestSchema } from "@/features/roleplay/schemas";
import { generateMockBuyerReply } from "@/features/roleplay/mock-buyer";
import { getServerEnv } from "@/lib/env";
import { safeErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = conversationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid roleplay request.",
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

  const mockReply = () => generateMockBuyerReply(parsed.data);

  if (!getServerEnv().GROQ_API_KEY) {
    return response({ reply: mockReply(), mode: "mock" });
  }

  try {
    return response({
      reply: await generateLiveBuyerReply(parsed.data),
      mode: "live",
    });
  } catch (error) {
    return response({
      reply: mockReply(),
      mode: "mock",
      fallbackReason: safeErrorMessage(error),
    });
  }
}

function response({
  reply,
  mode,
  fallbackReason,
}: {
  reply: string;
  mode: "live" | "mock";
  fallbackReason?: string;
}) {
  return Response.json(
    {
      turnId: crypto.randomUUID(),
      reply,
      mode,
      ...(fallbackReason ? { fallbackReason } : {}),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

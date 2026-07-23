import "server-only";

import { buildConversationMessages } from "@/features/roleplay/prompt";
import type { ConversationRequest } from "@/features/roleplay/schemas";
import { getServerEnv } from "@/lib/env";
import { getGroqClient } from "@/lib/groq";

export async function generateLiveBuyerReply(
  request: ConversationRequest,
): Promise<string> {
  const env = getServerEnv();
  const completion = await getGroqClient().chat.completions.create({
    model: env.GROQ_CHAT_MODEL,
    messages: buildConversationMessages(request),
    temperature: 0.7,
    max_completion_tokens: 180,
  });

  const reply = completion.choices[0]?.message.content?.trim();

  if (!reply) {
    throw new Error("The buyer model returned an empty response.");
  }

  return reply.slice(0, 500);
}

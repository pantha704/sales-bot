import type {
  ConversationRequest,
  Difficulty,
} from "@/features/roleplay/schemas";

const difficultyOpeners: Record<Difficulty, readonly string[]> = {
  easy: ["That sounds useful.", "I can see the potential.", "Interesting."],
  medium: [
    "Possibly, but I need more detail.",
    "That could help, although I am not convinced yet.",
    "I understand the idea.",
  ],
  hard: [
    "That is still too broad.",
    "I have heard similar claims before.",
    "I am not convinced.",
  ],
};

function stableIndex(value: string, length: number) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % length;
}

function includesAny(message: string, words: readonly string[]) {
  return words.some((word) => message.includes(word));
}

export function generateMockBuyerReply(request: ConversationRequest): string {
  const message = request.sellerMessage.toLowerCase();
  const persona = request.persona;
  const openerOptions = difficultyOpeners[persona.difficulty];
  const opener = openerOptions[stableIndex(message, openerOptions.length)];

  if (includesAny(message, ["price", "cost", "budget", "roi", "return"])) {
    return `${opener} Budget is one of my concerns. What measurable result would justify the cost for a team like ours?`;
  }

  if (
    includesAny(message, [
      "security",
      "privacy",
      "data",
      "compliance",
      "customer information",
    ])
  ) {
    return `${opener} How would you protect our customer and CRM data, and what information does the AI retain?`;
  }

  if (
    includesAny(message, [
      "integrate",
      "integration",
      "implement",
      "setup",
      "deploy",
    ])
  ) {
    return `${opener} We cannot afford a long rollout. What would implementation require from my team?`;
  }

  if (
    includesAny(message, ["problem", "challenge", "today", "currently", "goal"])
  ) {
    return `Our biggest issue is ${persona.goals[0]}. Managers handle coaching differently, so I need evidence that this would make the process more consistent.`;
  }

  const concern =
    persona.concerns[request.messages.length % persona.concerns.length];

  return `${opener} Before we go further, explain how you would address ${concern} without adding more work for my team.`;
}

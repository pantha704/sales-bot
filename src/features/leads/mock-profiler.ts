import type {
  LeadCategory,
  LeadSubmission,
} from "@/features/leads/schemas";

const organizationalTerms = [
  "leadership",
  "manager",
  "management",
  "culture",
  "team",
  "organizational",
  "development",
  "training",
  "coaching",
  "employee",
];

const salesBotTerms = [
  "sales",
  "roleplay",
  "role play",
  "bot",
  "ai",
  "pitch",
  "discovery",
  "enablement",
  "objection",
  "revenue",
];

function score(text: string, terms: readonly string[]) {
  return terms.reduce(
    (total, term) => total + (text.includes(term) ? 1 : 0),
    0,
  );
}

export function profileLeadLocally(lead: LeadSubmission): {
  category: LeadCategory;
  reason: string;
} {
  const context = `${lead.query} ${lead.pageHistory.join(" ")}`.toLowerCase();
  const organizationalScore = score(context, organizationalTerms);
  const salesBotScore = score(context, salesBotTerms);
  const category: LeadCategory =
    organizationalScore > salesBotScore
      ? "Organizational Development"
      : "Sales Bots";
  const reason =
    category === "Organizational Development"
      ? "The visitor’s message and browsing history emphasize leadership, team development, or organizational coaching."
      : "The visitor’s message and browsing history emphasize sales practice, enablement, roleplay, or AI sales tooling.";

  return { category, reason };
}

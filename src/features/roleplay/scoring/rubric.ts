export const SCORE_DIMENSION_IDS = [
  "discovery",
  "objections",
  "value",
  "structure",
  "next_steps",
] as const;

export type ScoreDimensionId = (typeof SCORE_DIMENSION_IDS)[number];

export type ScoreDimensionDef = {
  id: ScoreDimensionId;
  label: string;
  weight: number;
  guide: string;
};

/** Transparent coach rubric — weights sum to 1. */
export const SCORE_RUBRIC: readonly ScoreDimensionDef[] = [
  {
    id: "discovery",
    label: "Discovery",
    weight: 0.25,
    guide:
      "Seller asks open questions and surfaces goals, constraints, or decision criteria. Vague small-talk does not count.",
  },
  {
    id: "objections",
    label: "Objection handling",
    weight: 0.25,
    guide:
      "Seller acknowledges concerns, probes, and answers without arguing, skipping, or drowning the buyer in features.",
  },
  {
    id: "value",
    label: "Value clarity",
    weight: 0.2,
    guide:
      "Seller ties claims to this buyer’s context with specific, credible impact — not generic product marketing.",
  },
  {
    id: "structure",
    label: "Conversation structure",
    weight: 0.15,
    guide:
      "Seller keeps a clear flow: open → explore → advance without monologues or random topic jumps.",
  },
  {
    id: "next_steps",
    label: "Next steps",
    weight: 0.15,
    guide:
      "Seller proposes a concrete, time-bound follow-up, meeting, pilot, or decision path — not a vague 'let me know'.",
  },
] as const;

export const MIN_SELLER_TURNS_TO_SCORE = 2;

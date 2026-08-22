// Kept isolated (not baked into the card component) so the OVR thresholds
// can be changed in one place later without touching rendering code.
export type CardTier = "bronze" | "silver" | "gold";

export function cardTierForOverall(overall: number): CardTier {
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

// The 3 user-approved frame assets (Step 5D) - copied byte-for-byte into
// public/fc27/cards/, never regenerated. Decorative background layer only;
// all text/numbers rendered on top come from fc27_players, never from
// these images.
export const CARD_TIER_FRAME: Record<CardTier, string> = {
  bronze: "/fc27/cards/base-bronze.png",
  silver: "/fc27/cards/base-silver.png",
  gold: "/fc27/cards/base-gold.png",
};

// Native pixel dimensions of each frame file (see the Step 5D asset audit -
// bronze/gold are 1024x1536, silver is 1060x1484, a slightly different
// canvas). The card component sizes each tier's container to its own true
// ratio via CSS aspect-ratio, so the artwork is never stretched/cropped to
// force a shared ratio across tiers.
export const CARD_TIER_DIMENSIONS: Record<CardTier, { width: number; height: number }> = {
  bronze: { width: 1024, height: 1536 },
  silver: { width: 1060, height: 1484 },
  gold: { width: 1024, height: 1536 },
};

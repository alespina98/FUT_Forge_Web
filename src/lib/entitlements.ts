// Unified FUT Forge tier/entitlements resolver.
//
// USER -> TIER -> ENTITLEMENTS -> FEATURE ACCESS
//
// This is intentionally the ONLY place that decides what a tier can access.
// Nothing else in the app should hardcode "if (tier === 'premium')" - call
// canUseFeature()/getEntitlements() instead, so a future real Premium tier
// only needs to change the FEATURE_TIERS table below, not call sites.
//
// Today: FUT Forge is entirely free. FREE and PREMIUM both resolve to every
// feature - there is no paywall, no Stripe, no pricing. This module only
// exists so the *shape* of tiered access already exists before Premium is
// real, instead of retrofitting it later across dozens of call sites.
export type Tier = "free" | "premium";

export type FeatureId =
  | "sbc.quick_complete"
  | "sbc.auto_complete"
  | "sbc.multi_completion"
  | "sbc.pricing"
  | "evo.builder"
  | "club.sync"
  | "browser.mode";

export const FEATURE_IDS: readonly FeatureId[] = [
  "sbc.quick_complete",
  "sbc.auto_complete",
  "sbc.multi_completion",
  "sbc.pricing",
  "evo.builder",
  "club.sync",
  "browser.mode",
];

// Every feature is available on every tier today. When a real Premium tier
// ships, individual entries move from "both" to "premium" here - no other
// file needs to change.
const FEATURE_TIERS: Record<FeatureId, readonly Tier[]> = {
  "sbc.quick_complete": ["free", "premium"],
  "sbc.auto_complete": ["free", "premium"],
  "sbc.multi_completion": ["free", "premium"],
  "sbc.pricing": ["free", "premium"],
  "evo.builder": ["free", "premium"],
  "club.sync": ["free", "premium"],
  "browser.mode": ["free", "premium"],
};

// Minimal shape this module needs from a user - both the Supabase
// `@supabase/ssr` User (site) and the plain hydrated-profile object already
// produced by futforge_auth.js's hydratedUser() satisfy this without
// adaptation.
export type EntitlementUser = { id?: string | null; plan?: string | null; subscriptionTier?: string | null } | null | undefined;

export function getUserTier(user: EntitlementUser): Tier {
  if (!user || !user.id) return "free";
  const raw = String(user.subscriptionTier || user.plan || "FREE").toUpperCase();
  return raw === "PREMIUM" || raw === "ADMIN" ? "premium" : "free";
}

export function canUseFeature(user: EntitlementUser, feature: FeatureId): boolean {
  return FEATURE_TIERS[feature].includes(getUserTier(user));
}

export function getEntitlements(user: EntitlementUser): Record<FeatureId, boolean> {
  const tier = getUserTier(user);
  return Object.fromEntries(FEATURE_IDS.map((feature) => [feature, FEATURE_TIERS[feature].includes(tier)])) as Record<FeatureId, boolean>;
}

// Whether the user can use the product at all right now - the actual
// product gate for this milestone (Browser Mode + the site's Browser
// section). Distinct from per-feature entitlements: today it's just
// "is there a real session", but keeping it as its own function means the
// call sites (auth gate, locked-state UI) don't need to change when a real
// paywall is introduced later.
export function hasProductAccess(user: EntitlementUser): boolean {
  return !!(user && user.id);
}

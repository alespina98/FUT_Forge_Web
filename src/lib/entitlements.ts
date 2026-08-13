// Unified FUT Forge role/tier/entitlements resolver.
//
// USER-facing account:  ROLE (USER | ADMIN)  -> administrative privilege only.
//                        TIER (FREE | PREMIUM) -> product plan.
//                        These are deliberately independent. An ADMIN is not a tier - an admin
//                        account still has its own FREE/PREMIUM tier value, and gets full access
//                        to features through that tier (both currently unlock everything) plus
//                        separate admin-only capabilities (the /app/admin panel and its RPCs),
//                        never through a fabricated "admin tier".
//
// FEATURE ACCESS resolution order (see resolveFeatureAccess): individual override (if any) wins,
// otherwise the tier default, otherwise deny.
//
// This is intentionally the ONLY place that encodes what a tier can access. Nothing else in the
// app should hardcode "if (tier === 'PREMIUM')" - call canUseFeature()/getEntitlements() instead,
// so a future real Premium tier only needs to change FEATURE_TIERS below, not call sites.
//
// Today: FUT Forge is entirely free. FREE and PREMIUM both resolve to every feature - there is no
// paywall, no Stripe, no pricing. This module (plus the admin panel it backs) only exists so the
// *shape* of tiered, per-feature access already exists before Premium is real, instead of
// retrofitting it later across dozens of call sites.
export type Role = "USER" | "ADMIN";
export type Tier = "FREE" | "PREMIUM";

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

export const FEATURE_LABELS: Record<FeatureId, string> = {
  "sbc.quick_complete": "Quick Complete",
  "sbc.auto_complete": "Auto Complete",
  "sbc.multi_completion": "Multi Completion",
  "sbc.pricing": "SBC Pricing",
  "evo.builder": "EVO Builder",
  "club.sync": "Club Sync",
  "browser.mode": "Browser Mode",
};

// Every feature is available on every tier today. When a real Premium tier
// ships, individual entries move from "both" to "PREMIUM" here - no other
// file needs to change.
const FEATURE_TIERS: Record<FeatureId, readonly Tier[]> = {
  "sbc.quick_complete": ["FREE", "PREMIUM"],
  "sbc.auto_complete": ["FREE", "PREMIUM"],
  "sbc.multi_completion": ["FREE", "PREMIUM"],
  "sbc.pricing": ["FREE", "PREMIUM"],
  "evo.builder": ["FREE", "PREMIUM"],
  "club.sync": ["FREE", "PREMIUM"],
  "browser.mode": ["FREE", "PREMIUM"],
};

export type EntitlementAccount = { id?: string | null; role?: string | null; tier?: string | null } | null | undefined;

export function getUserTier(account: EntitlementAccount): Tier {
  if (!account || !account.id) return "FREE";
  return String(account.tier || "FREE").toUpperCase() === "PREMIUM" ? "PREMIUM" : "FREE";
}

export function getUserRole(account: EntitlementAccount): Role {
  if (!account || !account.id) return "USER";
  return String(account.role || "USER").toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

export function isAdmin(account: EntitlementAccount): boolean {
  return getUserRole(account) === "ADMIN";
}

export type OverrideState = "ENABLED" | "DISABLED" | "DEFAULT";

// Resolution order: individual override wins, then the tier default, then deny for an unknown
// feature id. Used both by the (currently unused, since nothing is gated yet) canUseFeature() and
// directly by the admin user-detail panel to display DEFAULT/ENABLED/DISABLED per feature.
export function resolveFeatureAccess(tier: Tier, overrides: Partial<Record<FeatureId, boolean>>, feature: FeatureId): boolean {
  const override = overrides[feature];
  if (override !== undefined) return override;
  return FEATURE_TIERS[feature]?.includes(tier) ?? false;
}

export function canUseFeature(account: EntitlementAccount, feature: FeatureId, overrides: Partial<Record<FeatureId, boolean>> = {}): boolean {
  return resolveFeatureAccess(getUserTier(account), overrides, feature);
}

export function getEntitlements(account: EntitlementAccount, overrides: Partial<Record<FeatureId, boolean>> = {}): Record<FeatureId, boolean> {
  const tier = getUserTier(account);
  return Object.fromEntries(FEATURE_IDS.map((feature) => [feature, resolveFeatureAccess(tier, overrides, feature)])) as Record<FeatureId, boolean>;
}

// Whether the account can use the product at all right now - the actual
// product gate for this milestone (Browser Mode + the site's Browser
// section). Distinct from per-feature entitlements: today it's just
// "is there a real session", but keeping it as its own function means the
// call sites (auth gate, locked-state UI) don't need to change when a real
// paywall is introduced later.
export function hasProductAccess(account: EntitlementAccount): boolean {
  return !!(account && account.id);
}

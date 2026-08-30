// FUT Forge Trader — entitlement resolution (Milestone 1).
//
// Reuses the existing resolver (src/lib/entitlements.ts) and identity store
// (src/lib/auth/turso-identity-repository.ts) rather than inventing a
// parallel entitlement system - trader.* are plain FeatureIds, gated the
// same way sbc.*/evo.*/club.* already are, with the one deliberate
// difference that every trader.* FEATURE_TIERS entry is empty (see the
// comment there): no tier unlocks Trader by default, only a per-user
// entitlement_overrides row can.
import "server-only";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import { getIdentityRepository } from "../auth/turso-identity-repository.ts";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import { getUserTier, resolveFeatureAccess, TRADER_FEATURE_IDS, type FeatureId } from "../entitlements.ts";

export type TraderEntitlements = {
  "trader.access": boolean;
  "trader.auto_bid": boolean;
  "trader.auto_trade": boolean;
  "trader.sniping": boolean;
  "trader.sbc": boolean;
};

const CLOSED: TraderEntitlements = {
  "trader.access": false,
  "trader.auto_bid": false,
  "trader.auto_trade": false,
  "trader.sniping": false,
  "trader.sbc": false,
};

// Global operator kill switch: independent of and layered on top of the
// per-user entitlement resolution below. Mirrors futforge_core/trader.js's
// client-side killSwitch input and browser_extension/background.js's
// TRADER_KILL_SWITCH constant - all three must be checked, any one of them
// closing the gate is enough to keep Trader fully inert.
export function traderKillSwitchActive(): boolean {
  return process.env.TRADER_KILL_SWITCH === "true";
}

// Server-authoritative, fail-closed. Returns CLOSED (never throws, never
// defaults open) for: no applicationUserId, kill switch active, unknown
// user, or any repository error. trader.access is the master switch - every
// sub-flag is forced false whenever it resolves false, so a stale override
// on a sub-flag alone can never unlock anything.
export async function resolveTraderAccess(applicationUserId: string | null | undefined): Promise<TraderEntitlements> {
  if (!applicationUserId || traderKillSwitchActive()) return { ...CLOSED };

  let profile;
  let overrides;
  try {
    const repo = getIdentityRepository();
    [profile, overrides] = await Promise.all([repo.getUserByApplicationId(applicationUserId), repo.getEntitlementOverrides(applicationUserId)]);
  } catch {
    return { ...CLOSED };
  }
  if (!profile) return { ...CLOSED };

  const tier = getUserTier(profile);
  const overrideMap: Partial<Record<FeatureId, boolean>> = {};
  for (const row of overrides) {
    if ((TRADER_FEATURE_IDS as readonly string[]).includes(row.feature_id)) overrideMap[row.feature_id as FeatureId] = row.enabled;
  }

  const access = resolveFeatureAccess(tier, overrideMap, "trader.access");
  if (!access) return { ...CLOSED };

  return {
    "trader.access": true,
    "trader.auto_bid": resolveFeatureAccess(tier, overrideMap, "trader.auto_bid"),
    "trader.auto_trade": resolveFeatureAccess(tier, overrideMap, "trader.auto_trade"),
    "trader.sniping": resolveFeatureAccess(tier, overrideMap, "trader.sniping"),
    "trader.sbc": resolveFeatureAccess(tier, overrideMap, "trader.sbc"),
  };
}

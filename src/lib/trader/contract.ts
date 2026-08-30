// FUT Forge Trader — contract v0.1.0 (Milestone 1: foundations).
//
// This is a NEW specification, written from FUT Forge's own audit of the
// recovered FUT Simple Trader 4.0.2 bundle
// (FUT_Simple_Trader_Recovery/AUDIT_RECUPERO_FUT_SIMPLE_TRADER.md, kept
// outside this repository). It intentionally does not reuse that bundle's
// field names, error codes or wire shapes verbatim - the recovered material
// is reference-only, never a runtime dependency (see decision #B in the
// Milestone 1 task and CONTRACT.md alongside this file for the full
// human-readable spec and the "reserved, not implemented" list).
//
// Every schema here is either read/write config or read-only reporting - see
// SCOPE ESCLUSO in the Milestone 1 task for what NOT to build yet. No schema
// in this file describes a request that could place a bid, buy, list, relist
// or submit an SBC; TraderSessionStatus is constrained to non-executing
// values by both this file and the DB CHECK constraint
// (turso/migrations/0005_trader_foundations.sql).
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

// Coin amounts: EA's own client caps a single listing well under 15M: this
// is a safety ceiling for Milestone 1's config surface, not a claim about
// EA's actual current limits (those must be re-verified empirically before
// any execution milestone - see the Milestone 1 report, Fase A).
const coinAmount = z.number().int().min(0).max(15_000_000);
const percent0to100 = z.number().min(0).max(100);
const rating = z.number().int().min(1).max(99);
const name80 = z.string().trim().min(1).max(80);

export const speedModeSchema = z.enum(["safe", "normal", "turbo"]);
export type SpeedMode = z.infer<typeof speedModeSchema>;

// "renderless" (call EA's own services.* directly, no UI clicks) vs "normal"
// (drive the real UI via click + MutationObserver) - both existed in the
// original product (see audit §3/§4) and neither is a new evasion
// technique: this contract only names the distinction, M1 implements
// neither loop.
export const searchModeSchema = z.enum(["renderless", "normal"]);
export type SearchMode = z.infer<typeof searchModeSchema>;

export const postPurchaseActionSchema = z.enum(["none", "list", "send_to_transfer_list"]);
export type PostPurchaseAction = z.infer<typeof postPurchaseActionSchema>;

export const stopAfterEventSchema = z.enum(["buys", "searches", "minutes"]);
export type StopAfterEvent = z.infer<typeof stopAfterEventSchema>;

// ---------------------------------------------------------------------------
// Market criteria / price-range walking (audit §4 "Ricerca di mercato")
// ---------------------------------------------------------------------------

export const marketCriteriaSchema = z
  .object({
    playerResourceId: z.number().int().positive().optional(),
    rarityIds: z.array(z.number().int().positive()).max(20).optional(),
    minRating: rating.optional(),
    maxRating: rating.optional(),
    minBid: coinAmount.optional(),
    maxBid: coinAmount.optional(),
    minBuyNow: coinAmount.optional(),
    maxBuyNow: coinAmount.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.minRating !== undefined && value.maxRating !== undefined && value.minRating > value.maxRating) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "minRating must be <= maxRating", path: ["minRating"] });
    }
    if (value.minBid !== undefined && value.maxBid !== undefined && value.minBid > value.maxBid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "minBid must be <= maxBid", path: ["minBid"] });
    }
    if (value.minBuyNow !== undefined && value.maxBuyNow !== undefined && value.minBuyNow > value.maxBuyNow) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "minBuyNow must be <= maxBuyNow", path: ["minBuyNow"] });
    }
  });
export type TraderMarketCriteria = z.infer<typeof marketCriteriaSchema>;

// Bounded step counts, not the walking loop itself (audit §4: the old
// product widened min/max price by one "step" per empty search cycle).
export const priceRangeWalkingSchema = z.object({
  minPriceRangeSteps: z.number().int().min(0).max(50).default(0),
  maxPriceRangeSteps: z.number().int().min(0).max(50).default(0),
});
export type TraderPriceRangeWalking = z.infer<typeof priceRangeWalkingSchema>;

// ---------------------------------------------------------------------------
// User settings (audit §4 "Sniping / Auto Bid" config surface)
// ---------------------------------------------------------------------------

export const traderUserSettingsSchema = z
  .object({
    speedMode: speedModeSchema.default("safe"),
    postPurchaseAction: postPurchaseActionSchema.default("none"),
    stopAfterEvent: stopAfterEventSchema.nullable().default(null),
    stopAfterValue: z.number().int().positive().max(100_000).nullable().default(null),
    maxCardPrice: coinAmount.nullable().default(null),
    minProfitAmount: coinAmount.nullable().default(null),
    minProfitPercent: percent0to100.nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if ((value.stopAfterEvent === null) !== (value.stopAfterValue === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "stopAfterEvent and stopAfterValue must be set together", path: ["stopAfterEvent"] });
    }
  });
export type TraderUserSettings = z.infer<typeof traderUserSettingsSchema>;

// ---------------------------------------------------------------------------
// Break / pause settings (audit §4 "Pause e limiti")
// ---------------------------------------------------------------------------

export const traderBreakSettingsSchema = z
  .object({
    breaksAfterSearches: z.number().int().min(1).max(10_000).default(100),
    breaksSeconds: z.number().int().min(0).max(86_400).default(60),
    longerBreaksAfterSearches: z.number().int().min(1).max(100_000).nullable().default(null),
    longerBreaksSeconds: z.number().int().min(0).max(86_400).nullable().default(null),
    randomizePercent: z.number().int().min(0).max(100).default(0),
  })
  .superRefine((value, ctx) => {
    if ((value.longerBreaksAfterSearches === null) !== (value.longerBreaksSeconds === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "longerBreaksAfterSearches and longerBreaksSeconds must be set together", path: ["longerBreaksAfterSearches"] });
    }
  });
export type TraderBreakSettings = z.infer<typeof traderBreakSettingsSchema>;

// ---------------------------------------------------------------------------
// Consent (audit §4 "Login e abilitazioni" — accept/reject terms)
// ---------------------------------------------------------------------------

export const CONSENT_VERSION = "trader-terms-v1";
export const consentDecisionSchema = z.enum(["ACCEPTED", "REJECTED"]);
export type TraderConsentDecision = z.infer<typeof consentDecisionSchema>;

// ---------------------------------------------------------------------------
// Filters / filter groups (audit §4 "Preset, filtri, rarità")
// ---------------------------------------------------------------------------

export const filterInputSchema = z.object({
  name: name80,
  groupId: z.string().uuid().nullable().optional(),
  criteria: marketCriteriaSchema,
});
export type TraderFilterInput = z.infer<typeof filterInputSchema>;

export const filterGroupInputSchema = z.object({ name: name80 });
export type TraderFilterGroupInput = z.infer<typeof filterGroupInputSchema>;

// ---------------------------------------------------------------------------
// Presets — reserved shapes for Auto Bid / Auto Trade (Milestone 2+)
//
// These are part of the M1 contract (Fase B asks for "contratti futuri di
// Auto Bid e Auto Trade") but nothing in this repository executes them yet:
// no route accepts a request that would start a loop against these configs.
// ---------------------------------------------------------------------------

export const autoBidPresetConfigSchema = z.object({
  criteria: marketCriteriaSchema,
  priceRangeWalking: priceRangeWalkingSchema.default({ minPriceRangeSteps: 0, maxPriceRangeSteps: 0 }),
  searchMode: searchModeSchema.default("renderless"),
  settings: traderUserSettingsSchema,
});
export type TraderAutoBidPresetConfig = z.infer<typeof autoBidPresetConfigSchema>;

// Rotation across multiple saved filters - the part the audit flags as
// "fortemente remota" / opaque in the original product (§3, §5): this
// contract only fixes the *shape* FUT Forge's own rotation engine will
// consume later, not the rotation algorithm itself, which is out of scope
// for Milestone 1 and will be designed fresh, not reverse-engineered.
export const autoTradePresetConfigSchema = z.object({
  filterIds: z.array(z.string().uuid()).min(1).max(50),
  minProfitAmount: coinAmount.nullable().default(null),
  minProfitPercent: percent0to100.nullable().default(null),
  settings: traderUserSettingsSchema,
});
export type TraderAutoTradePresetConfig = z.infer<typeof autoTradePresetConfigSchema>;

export const presetKindSchema = z.enum(["auto_bid", "auto_trade"]);
export type TraderPresetKind = z.infer<typeof presetKindSchema>;

export const presetInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto_bid"), name: name80, config: autoBidPresetConfigSchema }),
  z.object({ kind: z.literal("auto_trade"), name: name80, config: autoTradePresetConfigSchema }),
]);
export type TraderPresetInput = z.infer<typeof presetInputSchema>;

// ---------------------------------------------------------------------------
// Sessions — M1 is metadata-only. status is intentionally restricted to
// non-executing values; see the CHECK constraint in
// turso/migrations/0005_trader_foundations.sql for the DB-level mirror of
// this restriction.
// ---------------------------------------------------------------------------

export const sessionKindSchema = z.enum(["search", "auto_bid", "auto_trade"]);
export type TraderSessionKind = z.infer<typeof sessionKindSchema>;

// Reserved, NOT implemented in M1: RUNNING, PAUSED, STOPPED. No schema, no
// route, no DB CHECK value accepts them yet - see CONTRACT.md.
export const sessionStatusSchema = z.enum(["DRAFT", "ARCHIVED"]);
export type TraderSessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("search"), criteria: marketCriteriaSchema, priceRangeWalking: priceRangeWalkingSchema.optional() }),
  z.object({ kind: z.literal("auto_bid"), config: autoBidPresetConfigSchema }),
  z.object({ kind: z.literal("auto_trade"), config: autoTradePresetConfigSchema }),
]);
export type TraderSessionInput = z.infer<typeof sessionInputSchema>;

// ---------------------------------------------------------------------------
// Live stats / metrics (audit §4 "Statistiche") — read-only reporting
// shapes. M1's /api/trader/metrics returns real zeros (no execution path
// exists to increment them), never mocked non-zero data.
// ---------------------------------------------------------------------------

export const traderMetricsSchema = z.object({
  totalSearches: z.number().int().min(0),
  totalBids: z.number().int().min(0),
  totalSuccessBids: z.number().int().min(0),
  updatedAt: z.string(),
});
export type TraderMetrics = z.infer<typeof traderMetricsSchema>;

// ---------------------------------------------------------------------------
// Event / error codes — a NEW FUT Forge namespace (not the original
// product's alert_5003-5009 numeric codes, which are reference-only). Each
// entry documents the condition it reports; nothing in M1 raises these from
// a real engine yet, but the contract exists so the eventual engine and the
// eventual UI agree on names from day one.
// ---------------------------------------------------------------------------

export const traderEventCodeSchema = z.enum([
  "TOO_MANY_UNASSIGNED", // unassigned pile over its configured cap (audit §4: >4/>99)
  "TOO_MANY_RESULTS", // a search matched more than stopIfTooManyResults allows
  "PRICE_OUT_OF_RANGE", // a computed price fell outside the item's allowed EA range
  "DAILY_LIMIT_REACHED", // plan-level daily search/bid cap reached
  "INVALID_LIST_PRICE", // a relist price failed EA's own validation
  "INSUFFICIENT_FUNDS", // not enough coins for the next action
  "RATE_LIMITED", // EA returned a rate-limit response (e.g. HTTP 429/461 class)
  "SESSION_EXPIRED", // the Trader session's auth/entitlement is no longer valid
  "KILL_SWITCH_ENGAGED", // emergencyStop() fired (local or server-driven revoke)
]);
export type TraderEventCode = z.infer<typeof traderEventCodeSchema>;

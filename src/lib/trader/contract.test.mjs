import assert from "node:assert/strict";
import test from "node:test";
import {
  filterInputSchema,
  marketCriteriaSchema,
  presetInputSchema,
  sessionInputSchema,
  sessionStatusSchema,
  traderBreakSettingsSchema,
  traderUserSettingsSchema,
} from "./contract.ts";

test("valid market criteria round-trips", () => {
  const parsed = marketCriteriaSchema.safeParse({ minRating: 75, maxRating: 90, minBid: 1000, maxBid: 5000 });
  assert.equal(parsed.success, true);
});

test("market criteria rejects an inverted rating range", () => {
  assert.equal(marketCriteriaSchema.safeParse({ minRating: 90, maxRating: 75 }).success, false);
});

test("market criteria rejects an inverted price range", () => {
  assert.equal(marketCriteriaSchema.safeParse({ minBid: 5000, maxBid: 1000 }).success, false);
});

test("market criteria rejects a coin amount above the safety ceiling", () => {
  assert.equal(marketCriteriaSchema.safeParse({ minBid: 20_000_000 }).success, false);
});

test("market criteria rejects a negative price", () => {
  assert.equal(marketCriteriaSchema.safeParse({ minBid: -1 }).success, false);
});

test("market criteria rejects an out-of-range rating", () => {
  assert.equal(marketCriteriaSchema.safeParse({ minRating: 150 }).success, false);
});

test("market criteria caps rarityIds list length", () => {
  const many = Array.from({ length: 21 }, (_, i) => i + 1);
  assert.equal(marketCriteriaSchema.safeParse({ rarityIds: many }).success, false);
  assert.equal(marketCriteriaSchema.safeParse({ rarityIds: many.slice(0, 20) }).success, true);
});

test("user settings requires stopAfterEvent and stopAfterValue together", () => {
  assert.equal(traderUserSettingsSchema.safeParse({ stopAfterEvent: "buys" }).success, false);
  assert.equal(traderUserSettingsSchema.safeParse({ stopAfterValue: 10 }).success, false);
  assert.equal(traderUserSettingsSchema.safeParse({ stopAfterEvent: "buys", stopAfterValue: 10 }).success, true);
});

test("user settings applies safe defaults when omitted", () => {
  const parsed = traderUserSettingsSchema.parse({});
  assert.equal(parsed.speedMode, "safe");
  assert.equal(parsed.postPurchaseAction, "none");
  assert.equal(parsed.stopAfterEvent, null);
});

test("break settings requires longer-break pair together", () => {
  assert.equal(traderBreakSettingsSchema.safeParse({ longerBreaksAfterSearches: 500 }).success, false);
  assert.equal(traderBreakSettingsSchema.safeParse({ longerBreaksAfterSearches: 500, longerBreaksSeconds: 300 }).success, true);
});

test("break settings clamps randomizePercent to 0-100", () => {
  assert.equal(traderBreakSettingsSchema.safeParse({ randomizePercent: 101 }).success, false);
  assert.equal(traderBreakSettingsSchema.safeParse({ randomizePercent: -1 }).success, false);
});

test("filter input rejects an empty name and a name over 80 chars", () => {
  assert.equal(filterInputSchema.safeParse({ name: "", criteria: {} }).success, false);
  assert.equal(filterInputSchema.safeParse({ name: "x".repeat(81), criteria: {} }).success, false);
  assert.equal(filterInputSchema.safeParse({ name: "Cheap fodder", criteria: {} }).success, true);
});

test("preset input is a discriminated union keyed by kind", () => {
  const validAutoBid = presetInputSchema.safeParse({ kind: "auto_bid", name: "Safe sniping", config: { criteria: {}, settings: {} } });
  assert.equal(validAutoBid.success, true);
  const mismatched = presetInputSchema.safeParse({ kind: "auto_bid", name: "x", config: { filterIds: ["11111111-1111-4111-8111-111111111111"], settings: {} } });
  assert.equal(mismatched.success, false, "auto_bid kind must not accept an auto_trade-shaped config");
});

test("auto_trade preset requires at least one filterId", () => {
  const parsed = presetInputSchema.safeParse({ kind: "auto_trade", name: "Rotation", config: { filterIds: [], settings: {} } });
  assert.equal(parsed.success, false);
});

test("session input rejects malformed payloads", () => {
  assert.equal(sessionInputSchema.safeParse(null).success, false);
  assert.equal(sessionInputSchema.safeParse({}).success, false);
  assert.equal(sessionInputSchema.safeParse({ kind: "not-a-real-kind" }).success, false);
  assert.equal(sessionInputSchema.safeParse({ kind: "search", criteria: {} }).success, true);
});

test("session status schema only accepts non-executing values (M1 contract)", () => {
  assert.equal(sessionStatusSchema.safeParse("DRAFT").success, true);
  assert.equal(sessionStatusSchema.safeParse("ARCHIVED").success, true);
  for (const reserved of ["RUNNING", "PAUSED", "STOPPED"]) {
    assert.equal(sessionStatusSchema.safeParse(reserved).success, false, `${reserved} must not be a valid status in M1`);
  }
});

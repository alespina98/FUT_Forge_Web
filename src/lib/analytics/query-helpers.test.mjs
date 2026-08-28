import test from "node:test";
import assert from "node:assert/strict";
import { authClause, delta, normalizeAuthFilter, normalizeRange, num, platformClause, resolveWindow, safePct } from "./query-helpers.ts";

test("platformClause: unknown/missing platform values produce no filter (defaults to 'all')", () => {
  assert.deepEqual(platformClause(null), { clause: "", params: [] });
  assert.deepEqual(platformClause("all"), { clause: "", params: [] });
  assert.deepEqual(platformClause("toaster"), { clause: "", params: [] });
});

test("platformClause: a known client type parameterizes the filter", () => {
  assert.deepEqual(platformClause("android"), { clause: " AND client_type = ?", params: ["android"] });
  assert.deepEqual(platformClause("desktop_windows"), { clause: " AND client_type = ?", params: ["desktop_windows"] });
});

test('platformClause: "desktop" is a synthetic grouping filter matching both desktop OSes, not a stored value', () => {
  assert.deepEqual(platformClause("desktop"), {
    clause: " AND client_type IN (?,?)",
    params: ["desktop_windows", "desktop_macos"],
  });
});

test("authClause: authenticated/anonymous/unset", () => {
  assert.equal(authClause("authenticated"), " AND user_id IS NOT NULL");
  assert.equal(authClause("anonymous"), " AND user_id IS NULL");
  assert.equal(authClause(null), "");
  assert.equal(authClause("bogus"), "");
});

test("normalizeRange: only today/7d/30d/custom are accepted, anything else falls back to today", () => {
  assert.equal(normalizeRange("7d"), "7d");
  assert.equal(normalizeRange("30d"), "30d");
  assert.equal(normalizeRange("today"), "today");
  assert.equal(normalizeRange("custom"), "custom");
  assert.equal(normalizeRange(null), "today");
  assert.equal(normalizeRange("24h"), "today");
  assert.equal(normalizeRange("1y"), "today");
});

test("normalizeAuthFilter: only authenticated/anonymous are accepted, anything else is 'all'", () => {
  assert.equal(normalizeAuthFilter("authenticated"), "authenticated");
  assert.equal(normalizeAuthFilter("anonymous"), "anonymous");
  assert.equal(normalizeAuthFilter(null), "all");
  assert.equal(normalizeAuthFilter("bogus"), "all");
});

test("delta: a plain current-minus-previous difference, not a percentage", () => {
  assert.equal(delta(120, 100), 20);
  assert.equal(delta(80, 100), -20);
  assert.equal(delta(0, 0), 0);
  assert.equal(delta(5, 0), 5);
  assert.equal(delta(0, 10), -10);
});

test("safePct: never NaN/Infinity on a zero base, rounds to a whole percent", () => {
  assert.equal(safePct(1, 3), 33);
  assert.equal(safePct(0, 0), null);
  assert.equal(safePct(5, 0), null);
  assert.equal(safePct(1, 2), 50);
  assert.equal(safePct(2, 3), 67);
  assert.equal(safePct(0, 10), 0);
});

test("num: extracts the D1 count-row shape and defaults missing/undefined to 0", () => {
  assert.equal(num({ n: 42 }), 42);
  assert.equal(num({}), 0);
  assert.equal(num(undefined), 0);
});

test('resolveWindow("today"): a real UTC calendar day, not a rolling 24h window, compared against yesterday', () => {
  const now = Date.parse("2026-08-28T15:30:00.000Z");
  const win = resolveWindow("today", now);
  assert.equal(win.since, Date.parse("2026-08-28T00:00:00.000Z"));
  assert.equal(win.until, now);
  assert.equal(win.prevSince, Date.parse("2026-08-27T00:00:00.000Z"));
  assert.equal(win.prevUntil, win.since);
  assert.equal(win.bucketGranularity, "hour");
  assert.equal(win.comparisonLabel, "rispetto a ieri");
});

test('resolveWindow("7d")/("30d"): rolling windows compared against an equal-length preceding window, daily buckets', () => {
  const now = 1_000_000_000_000;
  const win7 = resolveWindow("7d", now);
  assert.equal(win7.since, now - 7 * 86400000);
  assert.equal(win7.prevSince, now - 14 * 86400000);
  assert.equal(win7.prevUntil, win7.since);
  assert.equal(win7.bucketGranularity, "day");

  const win30 = resolveWindow("30d", now);
  assert.equal(win30.since, now - 30 * 86400000);
  assert.equal(win30.prevSince, now - 60 * 86400000);
  assert.equal(win30.bucketGranularity, "day");
});

test('resolveWindow("custom"): explicit from/to, previous window is the same-length period immediately before, hourly buckets for short spans', () => {
  const now = Date.parse("2026-08-28T12:00:00.000Z");
  const from = Date.parse("2026-08-20T00:00:00.000Z");
  const to = Date.parse("2026-08-21T00:00:00.000Z");
  const win = resolveWindow("custom", now, from, to);
  assert.equal(win.since, from);
  assert.equal(win.until, to);
  assert.equal(win.prevUntil, from);
  assert.equal(win.prevSince, from - (to - from));
  assert.equal(win.bucketGranularity, "hour");
});

test('resolveWindow("custom"): a long span switches to daily buckets, and a future/invalid "to" is clamped to now', () => {
  const now = Date.parse("2026-08-28T12:00:00.000Z");
  const from = Date.parse("2026-06-01T00:00:00.000Z");
  const winLong = resolveWindow("custom", now, from, Date.parse("2099-01-01T00:00:00.000Z"));
  assert.equal(winLong.until, now);
  assert.equal(winLong.bucketGranularity, "day");
});

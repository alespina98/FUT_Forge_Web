import test from "node:test";
import assert from "node:assert/strict";
import { authClause, deltaPct, normalizeAuthFilter, normalizeRange, num, platformClause } from "./query-helpers.ts";

test("platformClause: unknown/missing platform values produce no filter (defaults to 'all')", () => {
  assert.deepEqual(platformClause(null), { clause: "", params: [] });
  assert.deepEqual(platformClause("all"), { clause: "", params: [] });
  assert.deepEqual(platformClause("toaster"), { clause: "", params: [] });
});

test("platformClause: a known client type parameterizes the filter", () => {
  assert.deepEqual(platformClause("desktop"), { clause: " AND client_type = ?", params: ["desktop"] });
});

test("authClause: authenticated/anonymous/unset", () => {
  assert.equal(authClause("authenticated"), " AND user_id IS NOT NULL");
  assert.equal(authClause("anonymous"), " AND user_id IS NULL");
  assert.equal(authClause(null), "");
  assert.equal(authClause("bogus"), "");
});

test("normalizeRange: only 24h/7d/30d are accepted, anything else falls back to 24h", () => {
  assert.equal(normalizeRange("7d"), "7d");
  assert.equal(normalizeRange("30d"), "30d");
  assert.equal(normalizeRange("24h"), "24h");
  assert.equal(normalizeRange(null), "24h");
  assert.equal(normalizeRange("1y"), "24h");
});

test("normalizeAuthFilter: only authenticated/anonymous are accepted, anything else is 'all'", () => {
  assert.equal(normalizeAuthFilter("authenticated"), "authenticated");
  assert.equal(normalizeAuthFilter("anonymous"), "anonymous");
  assert.equal(normalizeAuthFilter(null), "all");
  assert.equal(normalizeAuthFilter("bogus"), "all");
});

test("deltaPct: normal cases, zero baseline, and zero-to-zero", () => {
  assert.equal(deltaPct(120, 100), 20);
  assert.equal(deltaPct(80, 100), -20);
  assert.equal(deltaPct(0, 0), 0);
  assert.equal(deltaPct(5, 0), null);
  assert.equal(deltaPct(0, 10), -100);
});

test("num: extracts the D1 count-row shape and defaults missing/undefined to 0", () => {
  assert.equal(num({ n: 42 }), 42);
  assert.equal(num({}), 0);
  assert.equal(num(undefined), 0);
});

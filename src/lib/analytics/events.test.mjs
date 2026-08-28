import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClientType, CLIENT_TYPES, ALL_ACCEPTED_CLIENT_TYPES } from "./events.ts";

test("normalizeClientType passes canonical values through unchanged", () => {
  for (const value of CLIENT_TYPES) {
    assert.equal(normalizeClientType(value), value);
  }
});

test("normalizeClientType maps legacy platform spellings to their canonical value", () => {
  assert.equal(normalizeClientType("desktop"), "desktop_windows");
  assert.equal(normalizeClientType("extension"), "chrome_extension");
});

test("normalizeClientType rejects unknown platforms", () => {
  assert.equal(normalizeClientType("toaster"), null);
  assert.equal(normalizeClientType(""), null);
});

test("ALL_ACCEPTED_CLIENT_TYPES is exactly the canonical set plus legacy keys", () => {
  assert.equal(new Set(ALL_ACCEPTED_CLIENT_TYPES).size, ALL_ACCEPTED_CLIENT_TYPES.length);
  for (const value of CLIENT_TYPES) assert.ok(ALL_ACCEPTED_CLIENT_TYPES.includes(value));
  assert.ok(ALL_ACCEPTED_CLIENT_TYPES.includes("desktop"));
  assert.ok(ALL_ACCEPTED_CLIENT_TYPES.includes("extension"));
});

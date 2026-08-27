import assert from "node:assert/strict";
import test from "node:test";
import { eventEnvelopeSchema, eventBatchSchema } from "./schema.ts";

const base = { event: "page_view", client_type: "web", install_id: "install-1" };

test("accepts a minimal valid event", () => {
  const result = eventEnvelopeSchema.safeParse(base);
  assert.equal(result.success, true);
});

test("accepts a full event with scalar properties", () => {
  const result = eventEnvelopeSchema.safeParse({
    ...base,
    timestamp: Date.now(),
    client_version: "1.2.3",
    session_id: "session-1",
    properties: { path: "/foo", count: 3, ok: true, note: null },
  });
  assert.equal(result.success, true);
});

test("rejects an unknown event name", () => {
  const result = eventEnvelopeSchema.safeParse({ ...base, event: "totally_made_up_event" });
  assert.equal(result.success, false);
});

test("rejects an unknown client_type", () => {
  const result = eventEnvelopeSchema.safeParse({ ...base, client_type: "toaster" });
  assert.equal(result.success, false);
});

for (const key of ["password", "auth_token", "refresh_token", "cookie", "Authorization", "session_sid", "signing_secret"]) {
  test(`rejects a sensitive property key: ${key}`, () => {
    const result = eventEnvelopeSchema.safeParse({ ...base, properties: { [key]: "x" } });
    assert.equal(result.success, false);
  });
}

test("rejects a nested object property value", () => {
  const result = eventEnvelopeSchema.safeParse({ ...base, properties: { nested: { a: 1 } } });
  assert.equal(result.success, false);
});

test("rejects more than 20 properties", () => {
  const properties = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, i]));
  const result = eventEnvelopeSchema.safeParse({ ...base, properties });
  assert.equal(result.success, false);
});

test("batch accepts 1 to 25 events and rejects 26", () => {
  assert.equal(eventBatchSchema.safeParse({ events: [base] }).success, true);
  assert.equal(eventBatchSchema.safeParse({ events: Array.from({ length: 25 }, () => base) }).success, true);
  assert.equal(eventBatchSchema.safeParse({ events: Array.from({ length: 26 }, () => base) }).success, false);
  assert.equal(eventBatchSchema.safeParse({ events: [] }).success, false);
});

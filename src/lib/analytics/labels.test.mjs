import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_NAMES, CLIENT_TYPES } from "./events.ts";
import { eventLabel, eventIconKey, clientLabel, clientIconKey, isUnknownVersion, EVENT_LABELS, CLIENT_LABELS } from "./labels.ts";

test("every taxonomy event has a human-readable Italian label distinct from its raw name", () => {
  for (const event of EVENT_NAMES) {
    assert.ok(EVENT_LABELS[event], `missing label for ${event}`);
    assert.notEqual(eventLabel(event), event, `${event} label falls back to the raw name`);
    assert.doesNotMatch(EVENT_LABELS[event], /^[a-z_]+$/, `${event} label looks like a raw snake_case name, not Italian copy`);
  }
});

test("eventLabel falls back to the raw name for an unknown event (never throws)", () => {
  assert.equal(eventLabel("some_future_event"), "some_future_event");
});

test("every taxonomy event resolves to a known icon key", () => {
  for (const event of EVENT_NAMES) {
    assert.ok(typeof eventIconKey(event) === "string" && eventIconKey(event).length > 0);
  }
});

test("every client type has an Italian label and an icon key", () => {
  for (const clientType of CLIENT_TYPES) {
    assert.ok(CLIENT_LABELS[clientType], `missing label for ${clientType}`);
    assert.ok(clientIconKey(clientType));
  }
});

test("clientLabel/eventIconKey never throw and fall back sensibly for an unknown value", () => {
  assert.equal(clientLabel("toaster"), "toaster");
  assert.equal(eventIconKey("toaster"), "bolt");
  assert.equal(clientIconKey("toaster"), "devices");
});

test("isUnknownVersion recognizes null/empty/'unknown'/'na' as not-a-real-version", () => {
  assert.equal(isUnknownVersion(null), true);
  assert.equal(isUnknownVersion(undefined), true);
  assert.equal(isUnknownVersion(""), true);
  assert.equal(isUnknownVersion("unknown"), true);
  assert.equal(isUnknownVersion("na"), true);
  assert.equal(isUnknownVersion("2.11.5"), false);
  assert.equal(isUnknownVersion("1.0.18"), false);
});

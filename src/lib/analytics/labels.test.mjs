import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_NAMES, CLIENT_TYPES } from "./events.ts";
import { eventLabel, clientLabel, clientColor, EVENT_LABELS, CLIENT_LABELS, CLIENT_COLORS } from "./labels.ts";

test("every taxonomy event has a human-readable label distinct from its raw name", () => {
  for (const event of EVENT_NAMES) {
    assert.ok(EVENT_LABELS[event], `missing label for ${event}`);
    assert.notEqual(eventLabel(event), event, `${event} label falls back to the raw name`);
  }
});

test("eventLabel falls back to the raw name for an unknown event (never throws)", () => {
  assert.equal(eventLabel("some_future_event"), "some_future_event");
});

test("every client type has a label and a fixed categorical color", () => {
  for (const clientType of CLIENT_TYPES) {
    assert.ok(CLIENT_LABELS[clientType], `missing label for ${clientType}`);
    assert.ok(CLIENT_COLORS[clientType], `missing color for ${clientType}`);
    assert.match(CLIENT_COLORS[clientType], /^#[0-9a-f]{6}$/i);
  }
});

test("clientLabel/clientColor never throw and fall back sensibly for an unknown value", () => {
  assert.equal(clientLabel("toaster"), "toaster");
  assert.match(clientColor("toaster"), /^#[0-9a-f]{6}$/i);
});

test("no two platforms share the same categorical color (color follows the entity)", () => {
  const colors = CLIENT_TYPES.map((clientType) => CLIENT_COLORS[clientType]);
  assert.equal(new Set(colors).size, colors.length);
});

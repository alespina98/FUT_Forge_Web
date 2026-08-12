import assert from "node:assert/strict"; import test from "node:test";
import { classifyLeak, detectGame } from "./classifier.ts";
test("classifies deterministic categories", () => { assert.equal(classifyLeak("New Icon SBC coming"), "SBC"); assert.equal(classifyLeak("New Evolution requirements"), "EVOLUTION"); assert.equal(classifyLeak("ambiguous update"), "OTHER"); });
test("detects game", () => { assert.equal(detectGame("FC27 player"), "FC27"); assert.equal(detectGame("new player"), "FC26"); });

import assert from "node:assert/strict"; import test from "node:test"; import { leaksCopy } from "./copy.ts";
test("English and Italian leak dictionaries have the same shape", () => { const shape = (value) => value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k, shape(v)])) : typeof value; assert.deepEqual(shape(leaksCopy.it), shape(leaksCopy.en)); });

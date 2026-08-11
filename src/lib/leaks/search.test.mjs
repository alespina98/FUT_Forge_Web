import assert from "node:assert/strict";
import test from "node:test";
import { buildLeakPrefixQuery, matchesLeakPrefixSearch, searchableLeakText } from "./search.ts";

const translatedLeak = {
  title: "FUT Forge Leak System Test",
  shortDescription: "Canonical English test content",
  content: "This is a harmless verification entry.",
  normalizedSubject: "fut forge leak system test",
  translations: {
    it: { title: "Test del sistema Leak", content: "Questa voce di collaudo verifica la ricerca italiana." },
  },
};
const translatedText = searchableLeakText(translatedLeak);

test("complete Italian word matches translated content", () => assert.equal(matchesLeakPrefixSearch(translatedText, "collaudo"), true));
test("Italian prefix matches a complete translated word", () => assert.equal(matchesLeakPrefixSearch(translatedText, "collaud"), true));
test("prefix matching is case-insensitive", () => assert.equal(matchesLeakPrefixSearch(translatedText, "COLLAUD"), true));
test("translated Italian content is included in searchable text", () => assert.equal(matchesLeakPrefixSearch(translatedText, "ricerca ital"), true));
test("partial English content matches", () => assert.equal(matchesLeakPrefixSearch(translatedText, "verif"), true));
test("multi-word partial search requires every term", () => {
  const futureExample = "Cristiano Ronaldo FUTTIES SBC";
  assert.equal(matchesLeakPrefixSearch(futureExample, "ronaldo fut"), true);
  assert.equal(buildLeakPrefixQuery("ronaldo fut"), "ronaldo:* & fut:*");
});
test("unrelated query does not match", () => assert.equal(matchesLeakPrefixSearch(translatedText, "no-such-player"), false));
test("query builder strips operators instead of accepting raw tsquery syntax", () => assert.equal(buildLeakPrefixQuery("ronaldo | !fut:*"), "ronaldo:* & fut:*"));

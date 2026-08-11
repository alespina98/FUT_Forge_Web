import assert from "node:assert/strict";
import test from "node:test";
import { localizeLeakContent } from "./localize.ts";

const canonical = {
  title: "Canonical English title",
  shortDescription: "Canonical English summary",
  content: "Canonical English content",
  translations: {
    en: { title: "English translated title", short_description: "English translated summary", content: "English translated content" },
    it: { title: "Titolo italiano", short_description: "Riassunto italiano", content: "Contenuto italiano" },
  },
};

test("selects Italian localized leak content", () => {
  assert.deepEqual(localizeLeakContent(canonical, "it"), { title: "Titolo italiano", shortDescription: "Riassunto italiano", content: "Contenuto italiano" });
});

test("selects English localized leak content", () => {
  assert.deepEqual(localizeLeakContent(canonical, "en"), { title: "English translated title", shortDescription: "English translated summary", content: "English translated content" });
});

test("falls back entirely to canonical content when a locale is missing", () => {
  assert.deepEqual(localizeLeakContent(canonical, "fr"), { title: canonical.title, shortDescription: canonical.shortDescription, content: canonical.content });
});

test("falls back per field for partial or blank translations", () => {
  const partial = { ...canonical, translations: { it: { title: "Titolo parziale", short_description: "   " } } };
  assert.deepEqual(localizeLeakContent(partial, "it"), { title: "Titolo parziale", shortDescription: canonical.shortDescription, content: canonical.content });
});

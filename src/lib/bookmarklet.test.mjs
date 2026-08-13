import assert from "node:assert/strict";
import test from "node:test";
import { isEAWebAppUrl, makeBookmarklet, setBookmarkletDragData } from "./bookmarklet.ts";
const origin = "https://candidate.example.vercel.app";
test("the exact draggable href is one-line ASCII and directly parseable", () => {
  const href = makeBookmarklet(origin);
  assert.ok(href.startsWith("javascript:"));
  assert.equal(/[\r\n]/.test(href), false);
  assert.equal([...href].some((character) => character.charCodeAt(0) > 127), false);
  assert.doesNotMatch(href, /&(?:amp|quot|apos|#\d+|#x[\da-f]+);/i);
  assert.doesNotThrow(() => new Function(href.slice("javascript:".length)));
});
test("candidate uses stable with no dev or temporary URL", () => {
  const href = makeBookmarklet(origin);
  assert.match(href, /\/browser\/loader\.js\?channel=stable&t=/);
  assert.doesNotMatch(href, /channel=dev|dev\.5|bookmarklet-dev-preview/);
});
test("drag and manual installation receive the exact same href", () => {
  const values = new Map();
  const transfer = { effectAllowed: "none", setData: (format, data) => values.set(format, data) };
  const href = setBookmarkletDragData(origin, transfer);
  assert.equal(values.get("text/uri-list"), href);
  assert.equal(values.get("text/plain"), href);
});
test("EA Web App URL variants are accepted without widening to other EA pages", () => {
  for (const url of ["https://www.ea.com/ea-sports-fc/ultimate-team/web-app/", "https://www.ea.com/games/ea-sports-fc/ultimate-team/web-app/", "https://www.ea.com/it-it/games/ea-sports-fc/ultimate-team/web-app/?foo=1#home"]) assert.equal(isEAWebAppUrl(url), true, url);
  for (const url of ["http://www.ea.com/games/ea-sports-fc/ultimate-team/web-app/", "https://ea.com/games/ea-sports-fc/ultimate-team/web-app/", "https://www.ea.com/games/ea-sports-fc/", "https://www.ea.com.evil.example/games/ea-sports-fc/ultimate-team/web-app/"]) assert.equal(isEAWebAppUrl(url), false, url);
});
test("DEV preview bookmarklet selects only the DEV channel", () => {
  const href = makeBookmarklet(origin, "dev");
  assert.match(href, /channel=dev&t=/);
  assert.doesNotMatch(href, /channel=stable/);
});

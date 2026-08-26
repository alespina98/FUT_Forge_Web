import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("OpenNext config keeps static assets ahead of Worker compute", async () => {
  const wrangler = await read("wrangler.jsonc");
  assert.match(wrangler, /"nodejs_compat"/);
  assert.match(wrangler, /"directory": "\.open-next\/assets"/);
  assert.doesNotMatch(wrangler, /run_worker_first/);
});

test("FC27 runtime falls back to the Cloudflare static asset binding", async () => {
  const source = await read("src/lib/fc27/static-data.ts");
  assert.match(source, /getCloudflareContext/);
  assert.match(source, /\.ASSETS/);
  assert.match(source, /\/fc27-data\//);
});

test("global navigation does not prefetch the complete route graph", async () => {
  const navbar = await read("src/components/navbar.tsx");
  assert.match(navbar, /prefetch=\{false\}/);
  assert.doesNotMatch(navbar, /<Link (?!prefetch=\{false\})/);
});

test("Wrangler preserves dashboard-managed runtime variables and secrets", async () => {
  const wrangler = await read("wrangler.jsonc");
  const config = JSON.parse(wrangler);
  assert.equal(config.keep_vars, true);
  assert.equal(config.vars, undefined);
  assert.doesNotMatch(wrangler, /TURSO_DATABASE_URL|TURSO_AUTH_TOKEN/);
});

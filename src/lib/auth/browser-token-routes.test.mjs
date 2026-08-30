// Milestone 2 commit audit: proves the minimal backend fix (browser/refresh
// and browser/logout no longer require Origin===https://www.ea.com, same
// pattern desktop/refresh and desktop/logout already use with zero Origin
// check - see device-auth-service.ts) without weakening browser/start or
// browser/token, which keep the strict EA-origin gate unchanged.
//
// ENVIRONMENT LIMITATION (documented, not worked around silently): the
// route.ts files import NextResponse from "next/server", which Node's ESM
// loader cannot resolve outside Next's own bundler (no exports map entry
// for that subpath, and ESM deep-imports don't get CJS's automatic ".js"
// extension guessing) - confirmed by attempting the import directly, which
// fails with ERR_MODULE_NOT_FOUND regardless of --experimental-strip-types
// or --experimental-specifier-resolution. No existing test in this repo
// imports a route.ts handler directly for the same reason. This file
// therefore combines two things Node CAN actually execute, together
// proving the real change:
//   1. behavioral: the underlying service functions each route calls
//      (refreshBrowserSession/revokeBrowserSession) behave identically to
//      before - real DB, real tokens, same fixture pattern
//      device-auth-bridge.test.mjs already uses;
//   2. structural: the route source itself no longer gates refresh/logout
//      on Origin before calling those functions, while start/token
//      demonstrably still do - read directly from the shipped files, not
//      reimplemented/asserted in prose.
import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createClient } from "@libsql/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_AUTH_DIR = path.join(__dirname, "..", "..", "app", "api", "auth");

const directory = await mkdtemp(path.join(os.tmpdir(), "futforge-browser-routes-"));
process.env.TURSO_DATABASE_URL = `file:${path.join(directory, "identity.db")}`;
process.env.FUT_FORGE_TOKEN_SECRET = "test-only-secret-with-at-least-thirty-two-characters";
process.env.AUTH_BRIDGE_ENABLED = "true";
const ACTIVE_ID = "44444444-4444-4444-8444-444444444444";
process.env.AUTH_BRIDGE_TEST_USER_IDS = ACTIVE_ID;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "publishable-test-key";

const setup = createClient({ url: process.env.TURSO_DATABASE_URL });
for (const name of ["0001_website_identity.sql", "0002_password_recovery_state.sql", "0003_admin_control_plane.sql", "0004_device_auth_bridge.sql"]) {
  await setup.executeMultiple(await readFile(new URL(`../../../turso/migrations/${name}`, import.meta.url), "utf8"));
}
const now = new Date().toISOString();
await setup.batch(
  [
    { sql: "INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at,legacy_supabase_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)", args: [ACTIVE_ID, "active@example.com", "active@example.com", "ActiveUser", "activeuser", "USER", "FREE", now, now, "legacy-active"] },
    { sql: "INSERT INTO auth_identity_mapping(clerk_user_id,application_user_id,migration_state,created_at,migrated_at) VALUES(?,?,?,?,?)", args: ["clerk-active", ACTIVE_ID, "ACTIVE", now, now] },
  ],
  "write",
);

const service = await import("./device-auth-service.ts");

async function issueBrowserRefreshToken(requesterHash) {
  const challenge = await service.startDeviceAuthorization({ clientType: "browser", clientVersion: null, requesterHash }, "https://futforgeofficial.com");
  await service.approveBrowserAuthorization(challenge.user_code, "clerk-active");
  const issued = await service.pollBrowserAuthorization(challenge.device_code);
  assert.equal(issued.kind, "tokens");
  return issued.tokens.refresh_token;
}

// --- 1) behavioral: the service layer the routes call is unchanged --------

test("refreshBrowserSession (the function browser/refresh's route calls) still rotates tokens and rejects reuse", async () => {
  const refreshToken = await issueBrowserRefreshToken("behavior-refresh");
  const rotated = await service.refreshBrowserSession(refreshToken);
  assert.equal(rotated.kind, "tokens");
  assert.equal((await service.refreshBrowserSession(refreshToken)).kind, "reuse");
});

test("revokeBrowserSession (the function browser/logout's route calls) still revokes, and a revoked token stops refreshing", async () => {
  const refreshToken = await issueBrowserRefreshToken("behavior-logout");
  assert.equal(await service.revokeBrowserSession(refreshToken), true);
  assert.notEqual((await service.refreshBrowserSession(refreshToken)).kind, "tokens");
});

// --- 2) structural: read the real shipped route source, not a copy --------

function routeSource(...parts) {
  return readFileSync(path.join(API_AUTH_DIR, ...parts), "utf8");
}

test("browser/refresh route source no longer gates on Origin before calling refreshBrowserSession", () => {
  const src = routeSource("browser", "refresh", "route.ts");
  assert.match(src, /refreshBrowserSession/);
  assert.doesNotMatch(src, /if\(!headers\)return NextResponse\.json\(\{error:"invalid_origin"\}/, "refresh must not reject a missing/non-EA Origin before reaching refreshBrowserSession");
});

test("browser/logout route source no longer gates on Origin before calling revokeBrowserSession", () => {
  const src = routeSource("browser", "logout", "route.ts");
  assert.match(src, /revokeBrowserSession/);
  assert.doesNotMatch(src, /if\(!headers\)return NextResponse\.json\(\{error:"invalid_origin"\}/, "logout must not reject a missing/non-EA Origin before reaching revokeBrowserSession");
});

test("browser/start route source is UNCHANGED: still rejects when browserCors(request) returns no headers", () => {
  const src = routeSource("browser", "start", "route.ts");
  assert.match(src, /if\(!headers\)return NextResponse\.json\(\{error:"invalid_origin"\},\{status:403\}\)/, "start must keep its strict EA-origin gate - it anchors a brand-new authorization, unlike refresh/logout");
});

test("browser/token route source is UNCHANGED: still rejects when browserCors(request) returns no headers", () => {
  const src = routeSource("browser", "token", "route.ts");
  assert.match(src, /if\(!headers\)return NextResponse\.json\(\{error:"invalid_origin"\}/, "token must keep its strict EA-origin gate, unchanged by this fix");
});

test("browser/profile route source is UNCHANGED: still rejects when browserCors(request) returns no headers", () => {
  const src = routeSource("browser", "profile", "route.ts");
  assert.match(src, /if\(!headers\)return NextResponse\.json\(\{error:"invalid_origin"\}/, "profile was not part of this fix and must keep its existing gate");
});

test("desktop/refresh and desktop/logout (the precedent this fix follows) genuinely have no Origin check at all", () => {
  const refreshSrc = routeSource("desktop", "refresh", "route.ts");
  const logoutSrc = routeSource("desktop", "logout", "route.ts");
  assert.doesNotMatch(refreshSrc, /origin/i);
  assert.doesNotMatch(logoutSrc, /origin/i);
});

test("browser/refresh and browser/logout still import browserCors - CORS headers are still offered when Origin is the EA page, just no longer required", () => {
  assert.match(routeSource("browser", "refresh", "route.ts"), /import\s*\{browserCors\}/);
  assert.match(routeSource("browser", "logout", "route.ts"), /import\s*\{browserCors\}/);
});

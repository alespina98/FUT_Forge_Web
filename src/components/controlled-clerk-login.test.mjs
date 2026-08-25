import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("./controlled-clerk-login.tsx", import.meta.url), "utf8");
const routingRoute = readFileSync(new URL("../app/api/auth/clerk/login-routing/route.ts", import.meta.url), "utf8");
const completionRoute = readFileSync(new URL("../app/api/auth/clerk/complete-password-migration/route.ts", import.meta.url), "utf8");
const recovery = readFileSync(new URL("./clerk-password-recovery.tsx", import.meta.url), "utf8");
const importer = readFileSync(new URL("../../scripts/auth/import-legacy-profiles-to-turso.ts", import.meta.url), "utf8");

test("login asks the server for routing before attempting Clerk password auth", () => {
  const lookup = component.indexOf("/api/auth/clerk/login-routing");
  const password = component.indexOf("signIn.password");
  assert.ok(lookup !== -1 && password > lookup);
});

test("recovery-required login discards the password and never attempts Clerk auth", () => {
  const branch = component.slice(component.indexOf("if (routing?.recoveryRequired"), component.indexOf("const { error: signInError }"));
  assert.match(branch, /setPassword\(""\)/);
  assert.match(branch, /\/app\/forgot-password\?identifier=/);
  assert.match(branch, /return;/);
  assert.doesNotMatch(branch, /signIn\.password/);
});

test("ACTIVE and unknown users continue through generic Clerk password auth", () => {
  assert.match(component, /signIn\.password\(\{ identifier: normalizedIdentifier, password \}\)/);
  assert.match(component, /signIn\.finalize/);
  assert.doesNotMatch(component, /Supabase|supabase|localStorage|console\./);
});

test("routing state is resolved server-side and fails closed when Turso is unavailable", () => {
  assert.match(routingRoute, /getLoginRouting\(body\.identifier\)/);
  assert.match(routingRoute, /identity_database_unavailable/);
  assert.doesNotMatch(routingRoute, /password/);
});

test("password completion requires an authenticated Clerk user with a password", () => {
  assert.match(completionRoute, /await auth\(\)/);
  assert.match(completionRoute, /user\.passwordEnabled/);
  assert.match(completionRoute, /completePasswordMigration\(userId\)/);
});

test("recovery finalizes Clerk before activating mapping and redirecting", () => {
  const submit = recovery.indexOf("submitPassword");
  const finalize = recovery.indexOf("signIn.finalize");
  const activate = recovery.indexOf("/api/auth/clerk/complete-password-migration");
  const redirect = recovery.indexOf('router.replace("/app/account")');
  assert.ok(submit < finalize && finalize < activate && activate < redirect);
});

test("bulk import state depends on a valid bcrypt digest without persisting it", () => {
  assert.match(importer, /hasBcrypt\?"ACTIVE":"PASSWORD_RECOVERY_REQUIRED"/);
  assert.doesNotMatch(importer, /INSERT[^\n]*password_digest/i);
});

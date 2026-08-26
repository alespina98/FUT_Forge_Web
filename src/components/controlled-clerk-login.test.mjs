import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getAuthProvider, getPublicAuthProvider } from "../lib/auth/provider.ts";

const component = readFileSync(new URL("./controlled-clerk-login.tsx", import.meta.url), "utf8");
const routingRoute = readFileSync(new URL("../app/api/auth/clerk/login-routing/route.ts", import.meta.url), "utf8");
const completionRoute = readFileSync(new URL("../app/api/auth/clerk/complete-password-migration/route.ts", import.meta.url), "utf8");
const recovery = readFileSync(new URL("./clerk-password-recovery.tsx", import.meta.url), "utf8");
const importer = readFileSync(new URL("../../scripts/auth/import-legacy-profiles-to-turso.ts", import.meta.url), "utf8");
const provider = readFileSync(new URL("../lib/auth/provider.ts", import.meta.url), "utf8");
const loginPage = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const registerPage = readFileSync(new URL("../app/register/page.tsx", import.meta.url), "utf8");
const authRoot = readFileSync(new URL("./auth-root-provider.tsx", import.meta.url), "utf8");
const supabaseLogin = readFileSync(new URL("./login-form.tsx", import.meta.url), "utf8");

test("public auth UI uses the explicit build-safe provider while server authority remains AUTH_PROVIDER", () => {
  assert.match(provider, /process\.env\.AUTH_PROVIDER/);
  assert.match(provider, /process\.env\.NEXT_PUBLIC_AUTH_PROVIDER/);
  assert.match(provider, /parseProvider\(process\.env\.NEXT_PUBLIC_AUTH_PROVIDER\) \?\? getAuthProvider\(\)/);
  for (const file of [loginPage, registerPage, authRoot]) assert.match(file, /isPublicClerkAuth\(\)/);
});

test("Clerk UI never imports or calls the Supabase password path", () => {
  assert.doesNotMatch(component, /supabase|signInWithPassword/i);
  assert.match(component, /signIn\.password\(/);
  assert.match(supabaseLogin, /supabase\.auth\.signInWithPassword\(/);
});

test("public Clerk mode and Supabase rollback mode remain independently selectable", () => {
  const server = process.env.AUTH_PROVIDER;
  const browser = process.env.NEXT_PUBLIC_AUTH_PROVIDER;
  try {
    process.env.AUTH_PROVIDER = "clerk";
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "clerk";
    assert.equal(getAuthProvider(), "clerk");
    assert.equal(getPublicAuthProvider(), "clerk");
    process.env.AUTH_PROVIDER = "supabase";
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "supabase";
    assert.equal(getAuthProvider(), "supabase");
    assert.equal(getPublicAuthProvider(), "supabase");
  } finally {
    if (server === undefined) delete process.env.AUTH_PROVIDER; else process.env.AUTH_PROVIDER = server;
    if (browser === undefined) delete process.env.NEXT_PUBLIC_AUTH_PROVIDER; else process.env.NEXT_PUBLIC_AUTH_PROVIDER = browser;
  }
});

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

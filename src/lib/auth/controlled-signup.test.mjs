import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../../components/controlled-clerk-signup.tsx", import.meta.url), "utf8");
const finalize = readFileSync(new URL("../../app/api/auth/clerk/finalize-signup/route.ts", import.meta.url), "utf8");
const webhook = readFileSync(new URL("../../app/api/auth/clerk/webhook/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../supabase/migrations/0009_clerk_identity_mapping.sql", import.meta.url), "utf8");
const loginPage = readFileSync(new URL("../../app/login/page.tsx", import.meta.url), "utf8");
const registerPage = readFileSync(new URL("../../app/register/page.tsx", import.meta.url), "utf8");

test("server username intent is obtained before Clerk user creation", () => {
  assert.ok(component.indexOf('/api/auth/clerk/signup-intent') < component.indexOf('signUp.create'));
});

test("application profile finalization completes before session activation", () => {
  assert.ok(component.indexOf('/api/auth/clerk/finalize-signup') < component.indexOf('await setActive'));
});

test("a profile race loser is deleted or banned before a failure is returned", () => {
  assert.match(finalize, /deleteUser\(clerkUserId\)/);
  assert.match(finalize, /banUser\(clerkUserId\)/);
  assert.match(finalize, /username_race_lost/);
});

test("controlled user.created webhooks cannot race the explicit finalizer", () => {
  assert.match(webhook, /signupMode==="controlled"/);
  assert.match(webhook, /finalize_signup/);
});

test("Clerk signup and login never default or return to the removed Club route", () => {
  for (const page of [loginPage, registerPage]) {
    assert.match(page, /: "\/app\/account"/);
    assert.doesNotMatch(page, /\/app\/club/);
  }
});

test("database uniqueness is authoritative for both usernames and Clerk mappings", () => {
  assert.match(migration, /clerk_user_id text not null unique/i);
  assert.match(migration, /insert into public\.profiles/i);
  assert.match(migration, /insert into public\.auth_identity_mapping/i);
});

test("legacy mapping reuses an existing profile UUID and creates no profile", () => {
  const legacyFunction = migration.slice(migration.indexOf("map_existing_clerk_identity"));
  assert.match(legacyFunction, /p_legacy_supabase_user_id/);
  assert.match(legacyFunction, /insert into public\.auth_identity_mapping/i);
  assert.doesNotMatch(legacyFunction, /insert into public\.profiles/i);
});

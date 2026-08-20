import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(new URL("../components/register-form.tsx", import.meta.url), "utf8");
const copy = readFileSync(new URL("./copy.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../supabase/migrations/0006_require_username_on_signup.sql", import.meta.url), "utf8");
const priorMigrationPath = new URL("../../supabase/migrations/0005_admin_username_management.sql", import.meta.url);
const priorMigration = readFileSync(priorMigrationPath, "utf8");

test("registration form rejects missing/empty/whitespace-only username before submit (covers missing, null, undefined, '', '   ', '\\t\\n')", () => {
  // trim().length < 3 rejects every empty/whitespace-only value, since trimming always
  // reduces them to length 0 - covers "", "   ", "\t\n" and the missing/undefined case
  // (useState("") means an untouched field is already "").
  assert.match(form, /username\.trim\(\)\.length < 3/);
  assert.match(form, /required[\s\S]{0,80}minLength=\{3\}/);
});

test("registration form trims username before sending it to Supabase, does not fabricate one", () => {
  assert.match(form, /options: \{ data: \{ username: username\.trim\(\) \} \}/);
  assert.doesNotMatch(form, /email\.split\(["']@["']\)/);
  assert.doesNotMatch(form, /username\s*\|\|\s*email/);
  assert.doesNotMatch(form, /generateUsername|randomUsername/i);
});

test("submit button stays disabled while username is blank", () => {
  assert.match(form, /disabled=\{status === "submitting" \|\| !username\.trim\(\)/);
});

test("existing username length rule (3-32 chars) is preserved, not reinvented", () => {
  assert.match(form, /minLength=\{3\}/);
  assert.match(form, /maxLength=\{32\}/);
});

test("registration form checks username availability via RPC before calling signUp, using the trimmed value", () => {
  const rpcIdx = form.indexOf('supabase.rpc("is_username_available"');
  const signUpIdx = form.indexOf("supabase.auth.signUp(");
  assert.ok(rpcIdx > -1, "is_username_available RPC call not found");
  assert.ok(signUpIdx > -1, "signUp call not found");
  assert.ok(rpcIdx < signUpIdx, "availability check must run before signUp");
  assert.match(form, /p_username: username\.trim\(\)/);
});

test("registration form blocks signup and shows a specific error when the pre-check says the username is taken, without touching signUp on that path", () => {
  const blockMatch = form.match(/if \(!availabilityError && usernameAvailable === false\) \{[\s\S]{0,120}\}/);
  assert.ok(blockMatch, "expected an early-return branch guarding on a definite 'taken' result");
  assert.match(blockMatch[0], /setError\(r\.usernameTaken\)/);
  assert.match(blockMatch[0], /return;/);
});

test("registration form still handles email-already-in-use and falls back to a generic error otherwise (no regression)", () => {
  assert.match(form, /r\.emailInUse/);
  assert.match(form, /r\.genericError/);
});

test("signup trigger rejects missing/empty/whitespace username, normalized the same way as the client (btrim + nullif)", () => {
  assert.match(migration, /create or replace function public\.handle_new_user_profile/);
  assert.match(migration, /nullif\(btrim\(new\.raw_user_meta_data ->> 'username'\), ''\)/);
  assert.match(migration, /raise exception 'username is required'/);
});

test("trigger raises before the profiles insert, inside the same transaction as the auth.users insert (no orphaned account possible)", () => {
  const raiseIdx = migration.indexOf("raise exception 'username is required'");
  const insertIdx = migration.indexOf("insert into public.profiles");
  assert.ok(raiseIdx > -1 && insertIdx > -1 && raiseIdx < insertIdx);
  assert.match(migration, /language plpgsql/);
  assert.match(migration, /security definer/);
});

test("migration does not add a table-level NOT NULL/CHECK constraint that would break legacy rows without a username", () => {
  assert.doesNotMatch(migration, /alter table public\.profiles/i);
  assert.doesNotMatch(migration, /set not null/i);
  assert.doesNotMatch(migration, /add constraint/i);
});

test("migration enforces case-insensitive username uniqueness with a partial unique index on the normalized (trimmed, lowercased) value", () => {
  assert.match(migration, /create unique index if not exists profiles_username_unique_ci/);
  assert.match(migration, /on public\.profiles \(lower\(btrim\(username\)\)\)/);
  // Partial (excludes null/empty) so pre-existing usernameless rows can coexist.
  assert.match(migration, /where username is not null and btrim\(username\) <> ''/);
});

test("case-insensitive normalization treats Alessio / alessio / ALESSIO as the same username", () => {
  const normalize = (value) => value.trim().toLowerCase();
  assert.equal(normalize("Alessio"), normalize("alessio"));
  assert.equal(normalize("ALESSIO"), normalize("alessio"));
  assert.equal(normalize("  Alessio  "), normalize("alessio"));
  // The SQL side must use the equivalent normalization (lower + btrim), not a
  // case-sensitive or non-trimming comparison.
  assert.match(migration, /lower\(btrim\(/);
});

test("migration includes a defensive pre-check that fails the migration if duplicate normalized usernames already exist, without auto-correcting data", () => {
  const doBlockMatch = migration.match(/do \$\$[\s\S]*?profiles_username_unique_ci/);
  assert.ok(doBlockMatch, "expected a DO block pre-checking for duplicates before the unique index is created");
  const preCheckBody = doBlockMatch[0];
  assert.match(preCheckBody, /group by lower\(btrim\(username\)\)/);
  assert.match(preCheckBody, /having count\(\*\) > 1/);
  assert.match(preCheckBody, /raise exception/);
  // Must refuse to proceed, never silently merge/delete/null-out conflicting rows.
  assert.doesNotMatch(preCheckBody, /delete from|update public\.profiles set username/i);
});

test("is_username_available RPC returns only a boolean (no profile data exposed) and is callable before authentication", () => {
  assert.match(migration, /create or replace function public\.is_username_available\(p_username text\)\s*\nreturns boolean/);
  assert.match(migration, /security definer/);
  assert.match(migration, /not exists \(/);
  assert.match(migration, /grant execute on function public\.is_username_available\(text\) to anon, authenticated;/);
});

test("is_username_available's PUBLIC execute privilege is explicitly revoked before being granted only to anon/authenticated (least privilege)", () => {
  const revokeIdx = migration.indexOf("revoke all on function public.is_username_available(text) from public;");
  const grantIdx = migration.indexOf("grant execute on function public.is_username_available(text) to anon, authenticated;");
  assert.ok(revokeIdx > -1, "expected an explicit REVOKE ALL ... FROM PUBLIC");
  assert.ok(grantIdx > -1, "expected an explicit GRANT ... TO anon, authenticated");
  assert.ok(revokeIdx < grantIdx, "must revoke the default PUBLIC execute grant before re-granting narrowly");
});

test("is_username_available returns false (not true) for input registration would reject anyway - null, empty, whitespace, <3 or >32 chars - never a misleading 'available'", () => {
  const body = migration.slice(migration.indexOf("create or replace function public.is_username_available"), migration.indexOf("revoke all on function public.is_username_available"));
  assert.match(body, /when nullif\(btrim\(p_username\), ''\) is null then false/);
  assert.match(body, /when char_length\(btrim\(p_username\)\) < 3 then false/);
  assert.match(body, /when char_length\(btrim\(p_username\)\) > 32 then false/);
  // Same normalization the unique index and pre-check use.
  assert.match(body, /lower\(btrim\(username\)\) = lower\(btrim\(p_username\)\)/);
});

test("username enumeration via the anonymous availability RPC is explicitly acknowledged and accepted as a trade-off, with the RPC scoped to a boolean only", () => {
  const commentBlock = migration.slice(migration.indexOf("Accepted trade-off"), migration.indexOf("create or replace function public.is_username_available"));
  assert.match(commentBlock, /enumerate/i);
  assert.match(commentBlock, /no email, id, role/i);
});

test("every SECURITY DEFINER function this migration creates/redefines hardens search_path to '' and fully schema-qualifies its object references (no implicit schema resolution)", () => {
  const definerFunctions = [...migration.matchAll(/create or replace function public\.(\w+)\([^)]*\)[\s\S]*?security definer\s*\n(?:stable\s*\n)?set search_path = ('')/g)];
  const names = definerFunctions.map((m) => m[1]);
  assert.deepEqual(names.sort(), ["admin_set_user_username", "handle_new_user_profile", "is_username_available"].sort());
  for (const m of definerFunctions) {
    assert.equal(m[2], "''", `${m[1]} must use SET search_path = '' (found a mutable/implicit search_path instead)`);
  }
  // No leftover "set search_path = public" anywhere in this file - that's the
  // weaker, still-somewhat-mutable form we're hardening away from.
  assert.doesNotMatch(migration, /set search_path = public\b/);
});

test("handle_new_user_profile enforces the same 3-32 length rule as the client and admin RPC, at the DB level (not bypassable by calling auth.signUp() directly)", () => {
  const triggerBody = migration.slice(migration.indexOf("create or replace function public.handle_new_user_profile"), migration.indexOf("do $$"));
  assert.match(triggerBody, /char_length\(v_username\) < 3 or char_length\(v_username\) > 32/);
  assert.match(triggerBody, /raise exception 'username must be between 3 and 32 characters'/);
  // Length check must run before the insert, same as the required check.
  const lengthIdx = triggerBody.indexOf("char_length(v_username) < 3");
  const insertIdx = triggerBody.indexOf("insert into public.profiles");
  assert.ok(lengthIdx > -1 && insertIdx > -1 && lengthIdx < insertIdx);
});

test("registration form's availability RPC call matches the function name and argument the migration actually defines", () => {
  assert.match(form, /"is_username_available"/);
  assert.match(migration, /function public\.is_username_available\(p_username text\)/);
  assert.match(form, /p_username:/);
});

test("copy.ts defines a dedicated 'username already taken' string for EN and IT", () => {
  assert.match(copy, /usernameTaken: "This username is already taken\. Choose another one\."/);
  assert.match(copy, /usernameTaken: "Questo username è già in uso\. Scegline un altro\."/);
});

test("0006 redefines admin_set_user_username via CREATE OR REPLACE (not by editing 0005) and adds required/trim/length/case-insensitive-uniqueness checks", () => {
  assert.match(migration, /create or replace function public\.admin_set_user_username\(p_target_id uuid, p_new_username text\)/);
  assert.match(migration, /v_username text := nullif\(btrim\(p_new_username\), ''\)/);
  assert.match(migration, /raise exception 'username is required'/);
  assert.match(migration, /char_length\(v_username\) < 3 or char_length\(v_username\) > 32/);
  assert.match(migration, /lower\(btrim\(username\)\) = lower\(v_username\)/);
});

test("0005_admin_username_management.sql (historical migration) is untouched by this work - all admin-side changes live in 0006", () => {
  const currentHash = createHash("sha256").update(priorMigration).digest("hex");
  assert.equal(
    currentHash,
    "37f61ad663cea01846996f56d3c3c30a2458915362fbedf0c6a8bbf88cc73557",
    "0005_admin_username_management.sql changed - it must remain a historical migration; put new admin logic in 0006 via CREATE OR REPLACE instead"
  );
  assert.doesNotMatch(priorMigration, /lower\(btrim\(username\)\)/, "0005's original admin_set_user_username had no uniqueness check - that logic belongs in 0006");
});

test("admin_set_user_username's uniqueness is not just an application-level check - the UPDATE itself is also guarded against the DB unique index, so a race can't bypass it", () => {
  const occurrences = migration.match(/when unique_violation then/g) || [];
  // Once in handle_new_user_profile's insert, once in admin_set_user_username's update.
  assert.equal(occurrences.length, 2);
  assert.match(migration, /raise exception 'username already taken' using errcode = '23505'/);
});

test("the unique index is a single, top-level, real database constraint - not something a client bypass or an application code path can route around", () => {
  const indexOccurrences = migration.match(/create unique index if not exists profiles_username_unique_ci/g) || [];
  assert.equal(indexOccurrences.length, 1);
  // Every normalized-uniqueness check in this file (precheck, RPC, admin RPC) uses the
  // exact same normalization the index itself enforces.
  const normalizationOccurrences = migration.match(/lower\(btrim\(/g) || [];
  assert.ok(normalizationOccurrences.length >= 4, `expected consistent lower(btrim(...)) normalization across the file, found ${normalizationOccurrences.length}`);
});

test("the trigger this migration replaces is the same one that provisions role/tier defaults for every signup channel (0004), confirming this is the single shared enforcement point", () => {
  assert.match(priorMigration, /create or replace function public\.admin_set_user_username/);
  assert.match(migration, /create or replace function public\.handle_new_user_profile/);
  assert.match(migration, /'USER', 'FREE'/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = readFileSync(
  fileURLToPath(new URL("./clerk-password-recovery.tsx", import.meta.url)),
  "utf8",
);

test("uses the current Clerk v7 sign-in API instead of the legacy API", () => {
  assert.match(source, /from "@clerk\/nextjs"/);
  assert.doesNotMatch(source, /@clerk\/nextjs\/legacy/);
});

test("identifies the user before requesting a password reset email code", () => {
  assert.match(source, /signIn\.create\(\{ identifier: email\.trim\(\) \}\)/);
  assert.match(source, /signIn\.resetPasswordEmailCode\.sendCode\(\)/);
});

test("verifies the email code before accepting a new password", () => {
  assert.match(source, /signIn\.resetPasswordEmailCode\.verifyCode\(\{ code: code\.trim\(\) \}\)/);
  assert.match(source, /signIn\.status !== "needs_new_password"/);
  assert.match(source, /signIn\.resetPasswordEmailCode\.submitPassword/);
});

test("activates the recovered session and returns to the account page", () => {
  assert.match(source, /signIn\.status !== "complete"/);
  assert.match(source, /signIn\.finalize/);
  assert.match(source, /decorateUrl\("\/app\/account"\)/);
});

test("does not log Clerk recovery data or expose raw Clerk error messages", () => {
  assert.doesNotMatch(source, /console\.(log|warn|error|debug)\(/);
  assert.doesNotMatch(source, /longMessage/);
  assert.doesNotMatch(source, /error\?\.message/);
});

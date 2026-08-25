import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = readFileSync(
  fileURLToPath(new URL("./clerk-password-recovery.tsx", import.meta.url)),
  "utf8",
);

const functionBody = (name) => {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `missing ${name}`);
  const next = source.indexOf("\n  async function ", start + 1);
  return source.slice(start, next === -1 ? source.indexOf("\n  const formClass", start) : next);
};

test("uses the current Clerk v7 sign-in API instead of the legacy API", () => {
  assert.match(source, /from "@clerk\/nextjs"/);
  assert.doesNotMatch(source, /@clerk\/nextjs\/legacy/);
});

test("identifies the user before requesting a password reset email code", () => {
  assert.match(source, /signIn\.create\(\{ identifier: email\.trim\(\) \}\)/);
  assert.match(source, /signIn\.resetPasswordEmailCode\.sendCode\(\)/);
});

test("verifies the email code before accepting a new password", () => {
  const verifyCode = functionBody("verifyCode");
  assert.match(verifyCode, /signIn\.resetPasswordEmailCode\.verifyCode\(\{ code: code\.trim\(\) \}\)/);
  assert.match(verifyCode, /signIn\.status !== "needs_new_password"/);
  assert.match(verifyCode, /setStage\("password"\)/);
  assert.doesNotMatch(verifyCode, /finalize|setActive|submitPassword|router\.replace|setStage\("complete"\)/);
});

test("activates the recovered session and returns to the account page", () => {
  const resetPassword = functionBody("resetPassword");
  const submit = resetPassword.indexOf("submitPassword");
  const finalize = resetPassword.indexOf("signIn.finalize");
  const activateMapping = resetPassword.indexOf("/api/auth/clerk/complete-password-migration");
  const redirect = resetPassword.indexOf('router.replace("/app/account")');
  assert.ok(submit !== -1 && finalize > submit, "password must be created before session finalization");
  assert.match(resetPassword, /signIn\.status !== "complete"/);
  assert.ok(activateMapping > finalize, "mapping activation must follow Clerk finalization");
  assert.ok(redirect > activateMapping, "account redirect must follow mapping activation");
  assert.ok(resetPassword.indexOf('setStage("complete")') > finalize, "completion state must follow finalization");
});

test("a failed mapping activation signs out and never redirects", () => {
  const resetPassword = functionBody("resetPassword");
  const failedCompletion = resetPassword.slice(resetPassword.indexOf("if (!completion.ok)"), resetPassword.indexOf('setStage("complete")'));
  assert.match(failedCompletion, /await signOut\(\)/);
  assert.doesNotMatch(failedCompletion, /router\.replace/);
});

test("recovery has an explicit email to OTP to password to complete state machine", () => {
  assert.match(source, /type Stage = "email" \| "code" \| "password" \| "complete"/);
  assert.ok(source.indexOf('setStage("code")') < source.indexOf('setStage("password")'));
  assert.ok(source.indexOf('setStage("password")') < source.indexOf('setStage("complete")'));
});

test("requires matching passwords before calling Clerk", () => {
  const resetPassword = functionBody("resetPassword");
  assert.ok(resetPassword.indexOf("password !== confirmPassword") < resetPassword.indexOf("submitPassword"));
  assert.match(resetPassword, /setError\(text\.mismatch\)/);
});

test("shows the dedicated localized password creation step after OTP", () => {
  assert.match(source, /Create your new password/);
  assert.match(source, /Your email has been verified\. Choose a password for your FUT Forge account\./);
  assert.match(source, /Crea la tua nuova password/);
  assert.match(source, /La tua email è stata verificata\. Scegli una password per il tuo account FUT Forge\./);
  assert.match(source, /stage === "password" \|\| stage === "complete" \? text\.passwordTitle/);
});

test("OTP input remains six readable, non-overlapping numeric digits", () => {
  assert.match(source, /id="clerk-recovery-code"/);
  assert.match(source, /pattern="\[0-9\]\*"/);
  assert.match(source, /maxLength=\{6\}/);
  assert.match(source, /replace\(\/\\D\/g, ""\)\.slice\(0, 6\)/);
  assert.match(source, /font-mono text-lg tracking-\[\.35em\] tabular-nums/);
});

test("does not log Clerk recovery data or expose raw Clerk error messages", () => {
  assert.doesNotMatch(source, /console\.(log|warn|error|debug)\(/);
  assert.doesNotMatch(source, /longMessage/);
  assert.doesNotMatch(source, /error\?\.message/);
});

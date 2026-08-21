// Structural regression coverage for the password recovery UI. This project
// has no DOM/component-render test setup (see src/lib/bookmarklet.test.mjs
// and src/lib/browser-pricing.test.mjs for the established plain-node:test
// convention on this codebase) - these tests assert on source text instead
// of rendered output, mirroring that same lightweight approach for the
// pieces that are hard to unit-test as pure functions (JSX wiring, which
// Supabase call is used, and that no secret/enumeration-revealing branch
// was introduced). Pure logic (recovery-callback detection, new-password
// validation) is covered separately in src/lib/auth-recovery.test.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const componentsDir = fileURLToPath(new URL(".", import.meta.url));
const read = (name) => readFileSync(componentsDir + name, "utf8");

const loginForm = read("login-form.tsx");
const forgotPasswordForm = read("forgot-password-form.tsx");
const resetPasswordForm = read("reset-password-form.tsx");
const forgotPasswordPage = readFileSync(componentsDir + "../app/app/forgot-password/page.tsx", "utf8");
const resetPasswordPage = readFileSync(componentsDir + "../app/app/reset-password/page.tsx", "utf8");
const authConfirmRoute = readFileSync(componentsDir + "../app/auth/confirm/route.ts", "utf8");

test("the login form has a 'Forgot password?' action wired to /app/forgot-password", () => {
  assert.match(loginForm, /a\.forgotPasswordLink/);
  assert.match(loginForm, /\/app\/forgot-password/);
});

test("/app/forgot-password renders the recovery request form", () => {
  assert.match(forgotPasswordPage, /ForgotPasswordForm/);
});

test("/app/reset-password renders the new-password form", () => {
  assert.match(resetPasswordPage, /ResetPasswordForm/);
});

test("the recovery request uses Supabase's official resetPasswordForEmail API", () => {
  assert.match(forgotPasswordForm, /supabase\.auth\.resetPasswordForEmail\(/);
});

test("the recovery redirect is derived from the current origin, never hardcoded", () => {
  assert.match(forgotPasswordForm, /window\.location\.origin/);
  assert.doesNotMatch(forgotPasswordForm, /localhost/i);
  assert.doesNotMatch(forgotPasswordForm, /fut-forgev2/i);
});

test("the visible outcome of a recovery request never branches on whether the email exists", () => {
  // account-enumeration guard: the resolved { error } from resetPasswordForEmail
  // must never be inspected to choose what the user sees.
  assert.doesNotMatch(forgotPasswordForm, /\{\s*error[^}]*\}\s*=\s*await supabase\.auth\.resetPasswordForEmail/);
});

test("the forgot-password form links back to login", () => {
  assert.match(forgotPasswordForm, /f\.backToLogin/);
  // Login lives at the top-level /login route (moved out of /app as part of
  // the page-based site architecture) - /app/login now just redirects there.
  assert.match(forgotPasswordForm, /\/login/);
});

test("the reset-password form recognizes both the recovery success and error callback shapes", () => {
  assert.match(resetPasswordForm, /hasRecoveryError/);
  assert.match(resetPasswordForm, /PASSWORD_RECOVERY/);
});

test("the reset-password form validates the new password with the shared pure helper", () => {
  assert.match(resetPasswordForm, /validateNewPassword\(password, confirmPassword\)/);
});

test("the reset-password form completes the reset via Supabase's official updateUser API", () => {
  assert.match(resetPasswordForm, /supabase\.auth\.updateUser\(\{\s*password\s*\}\)/);
});

test("none of the recovery UI files log the recovery URL, code, or tokens", () => {
  for (const [name, source] of [
    ["login-form.tsx", loginForm],
    ["forgot-password-form.tsx", forgotPasswordForm],
    ["reset-password-form.tsx", resetPasswordForm],
  ]) {
    assert.doesNotMatch(source, /console\.(log|warn|error|debug)\(/, `${name} must not log recovery-sensitive data`);
  }
});

test("none of the recovery UI files reference a service-role key", () => {
  for (const source of [loginForm, forgotPasswordForm, resetPasswordForm]) {
    assert.doesNotMatch(source, /service_role/i);
  }
});

// /auth/confirm exists so a password-recovery link works no matter which
// browser/device opens it: verifyOtp is checked server-side against the
// token_hash and the resulting session is written to cookies shared by
// @supabase/ssr, instead of requiring the PKCE code_verifier that only the
// browser/WebView which called resetPasswordForEmail() ever had.
test("the auth confirm route verifies a recovery token_hash server-side via the shared SSR client", () => {
  assert.match(authConfirmRoute, /createSupabaseServerClient/);
  assert.match(authConfirmRoute, /verifyOtp\(\{\s*token_hash:\s*tokenHash,\s*type:\s*"recovery"\s*\}\)/);
});

test("the auth confirm route rejects any type other than recovery before calling verifyOtp", () => {
  assert.match(authConfirmRoute, /type !== "recovery"/);
});

test("the auth confirm route redirect destination is a hardcoded constant, never attacker-controlled input", () => {
  // Open-redirect guard: every NextResponse.redirect must target ALLOWED_NEXT,
  // never a `next`/query value read straight from the request.
  const redirects = authConfirmRoute.match(/NextResponse\.redirect\([^)]*\)/g) ?? [];
  assert.ok(redirects.length > 0, "expected at least one redirect");
  for (const call of redirects) assert.match(call, /ALLOWED_NEXT/, `redirect must use ALLOWED_NEXT: ${call}`);
});

test("the auth confirm route does not log the token_hash or verifyOtp result", () => {
  assert.doesNotMatch(authConfirmRoute, /console\.(log|warn|error|debug)\(/);
});

test("the auth confirm route does not reference a service-role key", () => {
  assert.doesNotMatch(authConfirmRoute, /service_role/i);
});

import assert from "node:assert/strict";
import test from "node:test";
import { hasRecoveryError, validateNewPassword } from "./auth-recovery.ts";

test("a Supabase error query param marks the recovery link invalid", () => {
  assert.equal(hasRecoveryError("", "?error=access_denied&error_code=otp_expired"), true);
});

test("a Supabase error hash param marks the recovery link invalid", () => {
  assert.equal(hasRecoveryError("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", ""), true);
});

test("a bare error_code without error is still recognized", () => {
  assert.equal(hasRecoveryError("", "?error_code=otp_expired"), true);
});

test("a PKCE code param (the success case) is not treated as an error", () => {
  assert.equal(hasRecoveryError("", "?code=abcd1234&type=recovery"), false);
});

test("no query or hash at all is not treated as an error", () => {
  assert.equal(hasRecoveryError("", ""), false);
});

test("password shorter than 6 characters is rejected", () => {
  assert.equal(validateNewPassword("abc12", "abc12"), "tooShort");
});

test("mismatched confirmation is rejected", () => {
  assert.equal(validateNewPassword("abcdef", "abcdeg"), "mismatch");
});

test("length is checked before the mismatch, matching the register form's ordering", () => {
  assert.equal(validateNewPassword("abc", "xyz"), "tooShort");
});

test("a valid matching password of sufficient length passes", () => {
  assert.equal(validateNewPassword("abcdef", "abcdef"), null);
});

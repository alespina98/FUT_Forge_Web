// Pure helpers for the password recovery callback (src/components/reset-password-form.tsx).
// Kept dependency-free so they're testable without a browser/DOM - see auth-recovery.test.mjs.

// Supabase's recovery redirect carries either an error (expired, already
// used, or otherwise invalid link - as ?error=... or #error=...) or a code
// the browser client exchanges automatically. This never inspects the
// error/code value itself, only whether one is present - the raw
// query/hash can carry the recovery code/tokens and must never be logged.
export function hasRecoveryError(hash: string, search: string): boolean {
  const params = new URLSearchParams((hash || "").replace(/^#/, "") || search || "");
  return Boolean(params.get("error") || params.get("error_code"));
}

export type PasswordValidationError = "tooShort" | "mismatch" | null;

export function validateNewPassword(password: string, confirmPassword: string): PasswordValidationError {
  if (password.length < 6) return "tooShort";
  if (password !== confirmPassword) return "mismatch";
  return null;
}

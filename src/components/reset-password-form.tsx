"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useI18n } from "./i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasRecoveryError, validateNewPassword } from "@/lib/auth-recovery";

type Stage = "checking" | "ready" | "invalid" | "success";
type Status = "idle" | "submitting" | "error";

export function ResetPasswordForm() {
  const { t } = useI18n();
  const p = t.resetPassword;
  const a = t.auth;

  // Always starts as "checking" on both server and client - the actual
  // check reads window.location, which only exists client-side, so it's
  // deferred to the effect below (same requestAnimationFrame-deferred-setState
  // pattern as src/components/i18n-provider.tsx) to avoid a hydration
  // mismatch between the server-rendered and first client-rendered markup.
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let timeout: number | undefined;

    const frame = window.requestAnimationFrame(() => {
      // The recovery link redirects back here with either an error
      // (expired, already used, or otherwise invalid link) or a code the
      // browser client exchanges automatically (detectSessionInUrl, on by
      // default - see src/lib/supabase/client.ts). Never log the raw
      // query/hash: it can carry the recovery code/tokens.
      if (hasRecoveryError(window.location.hash, window.location.search)) {
        setStage("invalid");
        return;
      }

      const supabase = createSupabaseBrowserClient();
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setStage("ready");
      });
      unsubscribe = () => listener.subscription.unsubscribe();

      // The exchange above may already have completed (and its event
      // already fired) by the time this subscribes - fall back to checking
      // for an established session directly.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setStage((current) => (current === "checking" ? "ready" : current));
      });

      timeout = window.setTimeout(() => {
        setStage((current) => (current === "checking" ? "invalid" : current));
      }, 6000);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribe?.();
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) {
      setStatus("error");
      setError(validationError === "tooShort" ? p.passwordTooShort : p.passwordMismatch);
      return;
    }

    setStatus("submitting");
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("error");
      setError(p.genericError);
      return;
    }
    setStage("success");
  }

  if (stage === "checking") {
    return (
      <div className="mx-auto max-w-md">
        <p className="section-label">{t.auth.eyebrow}</p>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <p className="text-sm text-white/60">{p.checking}</p>
        </div>
      </div>
    );
  }

  if (stage === "invalid") {
    return (
      <div className="mx-auto max-w-md">
        <p className="section-label">{t.auth.eyebrow}</p>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-[-.03em]">{p.invalidLinkTitle}</h1>
          <p className="mt-4 text-sm leading-6 text-white/60">{p.invalidLinkBody}</p>
          <Link href="/app/forgot-password" className="button-primary mt-6 inline-flex">
            {p.requestNewLink}
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "success") {
    return (
      <div className="mx-auto max-w-md">
        <p className="section-label">{t.auth.eyebrow}</p>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-[-.03em]">{p.successTitle}</h1>
          <p className="mt-4 text-sm leading-6 text-white/60">{p.successBody}</p>
          <Link href="/login" className="button-primary mt-6 inline-flex">
            {p.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="section-label">{t.app.club.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{p.title}</h1>
      <p className="mt-4 text-sm leading-6 text-white/50">{p.lead}</p>

      <form onSubmit={handleSubmit} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="reset-password-new">
            {p.newPasswordLabel}
          </label>
          <div className="relative">
            <input
              id="reset-password-new"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 pr-16 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-white/40 hover:text-white/70"
              aria-label={showPassword ? a.hidePassword : a.showPassword}
            >
              {showPassword ? a.hidePassword : a.showPassword}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="reset-password-confirm">
            {p.confirmPasswordLabel}
          </label>
          <input
            id="reset-password-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
          />
        </div>

        {status === "error" && error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
            <p className="text-sm font-semibold text-red-300">{p.errorTitle}</p>
            <p className="mt-1 text-sm text-white/60">{error}</p>
          </div>
        )}

        <button type="submit" className="button-primary" disabled={status === "submitting" || !password || !confirmPassword}>
          {status === "submitting" ? p.submittingButton : p.submitButton}
        </button>
      </form>
    </div>
  );
}

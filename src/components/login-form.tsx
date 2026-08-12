"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "error";

export function LoginForm() {
  const { t } = useI18n();
  const a = t.auth;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app/club";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    const supabase = createSupabaseBrowserClient();
    // Same FUT Forge account system Desktop already uses - this is the
    // identical Supabase project/anon key, not a second auth system.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setStatus("error");
      setError(signInError.status === 400 ? a.invalidCredentials : a.genericError);
      return;
    }
    // Server Components read the session from cookies (@supabase/ssr writes
    // them on sign-in) - refresh so they pick it up before navigating.
    router.refresh();
    router.push(next);
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="section-label">{t.app.club.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{a.title}</h1>
      <p className="mt-4 text-sm leading-6 text-white/50">{a.lead}</p>

      <form onSubmit={handleSubmit} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="login-email">
            {a.emailLabel}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="login-password">
            {a.passwordLabel}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
          />
        </div>

        {status === "error" && error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
            <p className="text-sm font-semibold text-red-300">{a.errorTitle}</p>
            <p className="mt-1 text-sm text-white/60">{error}</p>
          </div>
        )}

        <button type="submit" className="button-primary" disabled={status === "submitting" || !email.trim() || !password}>
          {status === "submitting" ? a.submittingButton : a.submitButton}
        </button>
      </form>

      <p className="mt-6 text-xs leading-5 text-white/30">{a.noAccount}</p>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "error" | "checkEmail";

export function RegisterForm() {
  const { t } = useI18n();
  const a = t.auth;
  const r = t.register;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app/club";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (username.trim().length < 3) {
      setStatus("error");
      setError(r.usernameTooShort);
      return;
    }
    if (password.length < 6) {
      setStatus("error");
      setError(r.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setError(r.passwordMismatch);
      return;
    }

    setStatus("submitting");
    const supabase = createSupabaseBrowserClient();
    // Same FUT Forge account system Desktop/Browser Mode already use - this
    // creates a real account in the one shared Supabase project, not a
    // second signup system. Email stays the Supabase Auth identity/login
    // credential; username is stored as Supabase's own user_metadata (no
    // new table/RLS) - futforge_auth.js's publicUser() already falls back
    // to user_metadata.username when the (separate, Desktop-only) profiles
    // row has none, so Desktop/Browser Mode pick this up with zero core
    // changes.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });

    if (signUpError) {
      setStatus("error");
      setError(signUpError.status === 400 && /registered|exists/i.test(signUpError.message) ? r.emailInUse : r.genericError);
      return;
    }

    // Supabase's actual response tells us which mode this project is
    // configured for - don't assume either behavior.
    if (data.session) {
      router.refresh();
      router.push(next);
      return;
    }
    setStatus("checkEmail");
  }

  if (status === "checkEmail") {
    return (
      <div className="mx-auto max-w-md">
        <p className="section-label">{t.app.club.eyebrow}</p>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-[-.03em]">{r.checkEmailTitle}</h1>
          <p className="mt-4 text-sm leading-6 text-white/60">{r.checkEmailBody.replace("{email}", email.trim())}</p>
          <Link href="/app/login" className="button-primary mt-6 inline-flex">
            {r.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="section-label">{t.app.club.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{r.title}</h1>
      <p className="mt-4 text-sm leading-6 text-white/50">{r.lead}</p>

      <form onSubmit={handleSubmit} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="register-username">
            {r.usernameLabel}
          </label>
          <input
            id="register-username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="register-email">
            {r.emailLabel}
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="register-password">
            {r.passwordLabel}
          </label>
          <div className="relative">
            <input
              id="register-password"
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
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="register-confirm-password">
            {r.confirmPasswordLabel}
          </label>
          <input
            id="register-confirm-password"
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
            <p className="text-sm font-semibold text-red-300">{r.errorTitle}</p>
            <p className="mt-1 text-sm text-white/60">{error}</p>
          </div>
        )}

        <button type="submit" className="button-primary" disabled={status === "submitting" || !username.trim() || !email.trim() || !password || !confirmPassword}>
          {status === "submitting" ? r.submittingButton : r.submitButton}
        </button>
      </form>

      <p className="mt-6 text-xs leading-5 text-white/30">
        {r.haveAccount}{" "}
        <Link href={`/app/login${next !== "/app/club" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-lime hover:text-lime/80">
          {r.haveAccountLinkLabel}
        </Link>
      </p>
    </div>
  );
}

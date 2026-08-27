"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "sent" | "error";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const f = t.forgotPassword;
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app/account";
  const loginHref = `/login${next !== "/app/account" ? `?next=${encodeURIComponent(next)}` : ""}`;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");
    const supabase = createSupabaseBrowserClient();
    try {
      // Supabase resolves this the same way whether or not the email belongs
      // to a real account (its own account-enumeration protection), so the
      // UI always shows the same neutral message below regardless of the
      // result - only a genuine transport failure gets a distinct error.
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/app/reset-password`,
      });
    } catch {
      setStatus("error");
      setError(f.networkError);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="mx-auto max-w-md">
        <p className="section-label">{t.auth.eyebrow}</p>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-[-.03em]">{f.title}</h1>
          <p className="mt-4 text-sm leading-6 text-white/60">{f.neutralMessage}</p>
          <Link href={loginHref} className="button-primary mt-6 inline-flex">
            {f.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="section-label">{t.app.club.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{f.title}</h1>
      <p className="mt-4 text-sm leading-6 text-white/50">{f.lead}</p>

      <form onSubmit={handleSubmit} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="forgot-password-email">
            {f.emailLabel}
          </label>
          <input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
          />
        </div>

        {status === "error" && error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
            <p className="text-sm font-semibold text-red-300">{f.errorTitle}</p>
            <p className="mt-1 text-sm text-white/60">{error}</p>
          </div>
        )}

        <button type="submit" className="button-primary" disabled={status === "submitting" || !email.trim()}>
          {status === "submitting" ? f.submittingButton : f.submitButton}
        </button>
      </form>

      <p className="mt-6 text-xs leading-5 text-white/30">
        <Link href={loginHref} className="font-semibold text-lime hover:text-lime/80">
          {f.backToLogin}
        </Link>
      </p>
    </div>
  );
}

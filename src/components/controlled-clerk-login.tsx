"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useI18n } from "./i18n-provider";

const copy = {
  en: { title: "Welcome back", lead: "Sign in to your FUT Forge account.", identifier: "Email or username", password: "Password", submit: "Sign in", submitting: "Signing in…", forgot: "Forgot password?", register: "Create an account", error: "We couldn't sign you in. Check your details and try again." },
  it: { title: "Bentornato", lead: "Accedi al tuo account FUT Forge.", identifier: "Email o username", password: "Password", submit: "Accedi", submitting: "Accesso…", forgot: "Password dimenticata?", register: "Crea un account", error: "Non è stato possibile accedere. Controlla i dati e riprova." },
} as const;

export function ControlledClerkLogin({ redirectUrl }: { redirectUrl: string }) {
  const { locale, t } = useI18n();
  const text = copy[locale];
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (fetchStatus === "fetching") return;
    setSubmitting(true);
    setError(null);
    const normalizedIdentifier = identifier.trim();
    try {
      const routingResponse = await fetch("/api/auth/clerk/login-routing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: normalizedIdentifier }) });
      if (!routingResponse.ok) {
        setError(text.error);
        return;
      }
      const routing = await routingResponse.json() as { recoveryRequired?: boolean; email?: string };
      if (routing?.recoveryRequired && routing.email) {
        setPassword("");
        router.replace(`/app/forgot-password?identifier=${encodeURIComponent(routing.email)}&upgraded=1`);
        return;
      }
      const { error: signInError } = await signIn.password({ identifier: normalizedIdentifier, password });
      if (signInError || signIn.status !== "complete") {
        setError(text.error);
        return;
      }
      const { error: finalizeError } = await signIn.finalize({ navigate: ({ decorateUrl }) => router.replace(decorateUrl(redirectUrl)) });
      if (finalizeError) setError(text.error);
    } catch {
      setError(text.error);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none";
  return <div className="mx-auto max-w-md"><p className="section-label">{t.auth.eyebrow}</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{text.title}</h1><p className="mt-4 text-sm text-white/50">{text.lead}</p><form onSubmit={submit} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8"><label className="text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="clerk-login-identifier">{text.identifier}</label><input id="clerk-login-identifier" required autoComplete="username" value={identifier} onChange={event=>setIdentifier(event.target.value)} className={inputClass}/><label className="text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="clerk-login-password">{text.password}</label><input id="clerk-login-password" type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} className={inputClass}/><Link href="/app/forgot-password" className="text-xs font-semibold text-lime hover:text-lime/80">{text.forgot}</Link><button type="submit" className="button-primary" disabled={submitting||fetchStatus==="fetching"||!identifier.trim()||!password}>{submitting?text.submitting:text.submit}</button></form>{error&&<div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[.06] p-4 text-sm text-red-300" role="alert">{error}</div>}<p className="mt-6 text-xs text-white/30"><Link href="/register" className="font-semibold text-lime hover:text-lime/80">{text.register}</Link></p></div>;
}

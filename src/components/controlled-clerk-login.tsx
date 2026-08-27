"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn, useUser } from "@clerk/nextjs";
import { useI18n } from "./i18n-provider";
import { createClerkFlowCorrelationId, navigateToDecoratedUrl, reportClerkFlowDiagnostic } from "@/lib/auth/clerk-flow-diagnostics";
import { getClerkAuthMessages, getClerkErrorMessage } from "@/lib/auth/clerk-error-messages";
import { track } from "@/lib/analytics/client";

const copy = {
  en: { title: "Welcome back", lead: "Sign in to your FUT Forge account.", identifier: "Email or username", password: "Password", submit: "Sign in", submitting: "Signing in…", forgot: "Forgot password?", register: "Create an account", error: "We couldn't sign you in. Check your details and try again." },
  it: { title: "Bentornato", lead: "Accedi al tuo account FUT Forge.", identifier: "Email o username", password: "Password", submit: "Accedi", submitting: "Accesso…", forgot: "Password dimenticata?", register: "Crea un account", error: "Non è stato possibile accedere. Controlla i dati e riprova." },
} as const;

export function ControlledClerkLogin({ redirectUrl }: { redirectUrl: string }) {
  const { locale, t } = useI18n();
  const text = copy[locale];
  const authErrors = getClerkAuthMessages(locale);
  const { signIn, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [clientTrustCode, setClientTrustCode] = useState("");
  const [needsClientTrust, setNeedsClientTrust] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (isLoaded && isSignedIn) router.replace(redirectUrl); }, [isLoaded, isSignedIn, redirectUrl, router]);

  async function finalizeSignIn(correlationId: string) {
    const { error: finalizeError } = await signIn.finalize({ navigate: ({ decorateUrl, session }) => {
      const destination = session.currentTask ? clerk.buildTasksUrl() : redirectUrl;
      navigateToDecoratedUrl(decorateUrl(destination), url => router.replace(url));
    } });
    reportClerkFlowDiagnostic({ operation: "finalize", correlationId, error: finalizeError, signInStatus: signIn.status, finalizeAttempted: true, finalizeFailed: Boolean(finalizeError) });
    if (finalizeError) { setError(getClerkErrorMessage(finalizeError, locale, "login")); track("login_failed", { reason: "finalize_error" }); }
    else track("login_success", { provider: "clerk" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSignedIn) { router.replace(redirectUrl); return; }
    if (fetchStatus === "fetching") return;
    setSubmitting(true);
    setError(null);
    const normalizedIdentifier = identifier.trim();
    const correlationId = createClerkFlowCorrelationId();
    try {
      const routingResponse = await fetch("/api/auth/clerk/login-routing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: normalizedIdentifier }) });
      if (!routingResponse.ok) {
        setError(authErrors.fallback);
        track("login_failed", { reason: "routing_unavailable" });
        return;
      }
      const routing = await routingResponse.json() as { recoveryRequired?: boolean; email?: string };
      if (routing?.recoveryRequired && routing.email) {
        setPassword("");
        router.replace(`/app/forgot-password?identifier=${encodeURIComponent(routing.email)}&upgraded=1`);
        return;
      }
      const clerkIdentifier = routing.email ?? normalizedIdentifier;
      const { error: signInError } = await signIn.password({ identifier: clerkIdentifier, password });
      reportClerkFlowDiagnostic({ operation: "password", correlationId, error: signInError, signInStatus: signIn.status });
      if (signInError) {
        setError(getClerkErrorMessage(signInError, locale, "login"));
        track("login_failed", { reason: "invalid_credentials" });
        return;
      }
      if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const { error: trustError } = await signIn.mfa.sendEmailCode();
        reportClerkFlowDiagnostic({ operation: "client_trust.send_email_code", correlationId, error: trustError, signInStatus: signIn.status });
        if (trustError) { setError(getClerkErrorMessage(trustError, locale, "verification")); track("login_failed", { reason: "client_trust_send_failed" }); }
        else { setPassword(""); setNeedsClientTrust(true); }
        return;
      }
      if (signIn.status !== "complete") { setError(authErrors.fallback); track("login_failed", { reason: "incomplete" }); return; }
      await finalizeSignIn(correlationId);
    } catch (caught) {
      const unexpected = caught instanceof Error ? { code: "unexpected_exception", message: caught.message } : { code: "unexpected_exception" };
      reportClerkFlowDiagnostic({ operation: "login", correlationId, error: unexpected, signInStatus: signIn.status });
      setError(authErrors.fallback);
      track("login_failed", { reason: "unexpected_exception" });
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyClientTrust(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const correlationId = createClerkFlowCorrelationId();
    try {
      const { error: trustError } = await signIn.mfa.verifyEmailCode({ code: clientTrustCode.trim() });
      reportClerkFlowDiagnostic({ operation: "client_trust.verify_email_code", correlationId, error: trustError, signInStatus: signIn.status });
      if (trustError || signIn.status !== "complete") { setError(getClerkErrorMessage(trustError, locale, "verification")); track("login_failed", { reason: "client_trust_verify_failed" }); return; }
      await finalizeSignIn(correlationId);
    } catch (caught) {
      const unexpected = caught instanceof Error ? { code: "unexpected_exception", message: caught.message } : { code: "unexpected_exception" };
      reportClerkFlowDiagnostic({ operation: "client_trust", correlationId, error: unexpected, signInStatus: signIn.status });
      setError(authErrors.fallback);
      track("login_failed", { reason: "unexpected_exception" });
    } finally { setSubmitting(false); }
  }

  const inputClass = "min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none";
  if (!isLoaded || isSignedIn) return null;
  return <div className="mx-auto max-w-md"><p className="section-label">{t.auth.eyebrow}</p><h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{text.title}</h1><p className="mt-4 text-sm text-white/50">{needsClientTrust ? "Enter the verification code Clerk sent to your email." : text.lead}</p>{needsClientTrust?<form onSubmit={verifyClientTrust} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8"><label className="text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="clerk-client-trust-code">Verification code</label><input id="clerk-client-trust-code" inputMode="numeric" autoComplete="one-time-code" required value={clientTrustCode} onChange={event=>setClientTrustCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={inputClass}/><button type="submit" className="button-primary" disabled={submitting||clientTrustCode.length!==6}>{submitting?text.submitting:"Verify and sign in"}</button></form>:<form onSubmit={submit} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8"><label className="text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="clerk-login-identifier">{text.identifier}</label><input id="clerk-login-identifier" required autoComplete="username" value={identifier} onChange={event=>setIdentifier(event.target.value)} className={inputClass}/><label className="text-xs font-semibold uppercase tracking-[.1em] text-white/50" htmlFor="clerk-login-password">{text.password}</label><input id="clerk-login-password" type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} className={inputClass}/><Link href="/app/forgot-password" className="text-xs font-semibold text-lime hover:text-lime/80">{text.forgot}</Link><button type="submit" className="button-primary" disabled={submitting||fetchStatus==="fetching"||!identifier.trim()||!password}>{submitting?text.submitting:text.submit}</button></form>}{error&&<div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[.06] p-4 text-sm text-red-300" role="alert">{error}</div>}<p className="mt-6 text-xs text-white/30"><Link href="/register" className="font-semibold text-lime hover:text-lime/80">{text.register}</Link></p></div>;
}

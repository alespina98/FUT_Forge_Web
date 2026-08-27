"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useI18n } from "./i18n-provider";
import { getClerkAuthMessages, getClerkErrorMessage } from "@/lib/auth/clerk-error-messages";

type Stage = "details" | "verification" | "failed";

const extra = {
  en: { code: "Verification code", verify: "Verify email", retry: "Start again", verificationLead: "Enter the verification code sent to your email.", passwordLength: "Password must be at least 8 characters." },
  it: { code: "Codice di verifica", verify: "Verifica email", retry: "Ricomincia", verificationLead: "Inserisci il codice di verifica inviato alla tua email.", passwordLength: "La password deve avere almeno 8 caratteri." },
} as const;

export function ControlledClerkSignup({ redirectUrl }: { redirectUrl: string }) {
  const { locale, t } = useI18n();
  const c = t.register;
  const x = extra[locale];
  const authErrors = getClerkAuthMessages(locale);
  const { isLoaded, signUp, setActive } = useSignUp();
  const [stage, setStage] = useState<Stage>("details");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [intent, setIntent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function beginSignup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const normalizedUsername = username.trim();
    if (normalizedUsername.length < 3 || normalizedUsername.length > 32 || !/^[\p{L}\p{N}_.-]+$/u.test(normalizedUsername)) { setError(c.usernameTooShort); return; }
    if (password.length < 8) { setError(authErrors.tooShort); return; }
    if (password !== confirmPassword) { setError(authErrors.mismatch); return; }
    if (!isLoaded) return;
    setSubmitting(true);
    try {
      const check = await fetch("/api/auth/clerk/signup-intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, username: normalizedUsername }) });
      const checked = await check.json() as { intent?: string };
      if (check.status === 409) { setError(c.usernameTaken); return; }
      if (!check.ok || !checked.intent) throw new Error("Signup check unavailable");
      setIntent(checked.intent);
      await signUp.create({ emailAddress: email.trim(), username: normalizedUsername, password, locale, unsafeMetadata: { signupMode: "controlled" } });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStage("verification");
    } catch (caught) {
      setError(getClerkErrorMessage(caught, locale, "signup"));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyAndFinalize(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status !== "complete" || !result.createdUserId || !result.createdSessionId) throw new Error("Incomplete signup");
      const finalized = await fetch("/api/auth/clerk/finalize-signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clerkUserId: result.createdUserId, intent }) });
      if (!finalized.ok) { setStage("failed"); setError(finalized.status === 409 ? c.usernameTaken : c.genericError); return; }
      await setActive({ session: result.createdSessionId });
      window.location.assign(redirectUrl);
    } catch (caught) {
      setError(getClerkErrorMessage(caught, locale, "verification"));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none";
  const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50";
  return <div className="mx-auto max-w-md">
    <p className="section-label">{t.auth.eyebrow}</p>
    <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{c.title}</h1>
    <p className="mt-4 text-sm leading-6 text-white/50">{stage === "verification" ? x.verificationLead : c.lead}</p>
    {stage === "details" && <form onSubmit={beginSignup} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8">
      <div><label className={labelClass} htmlFor="controlled-username">{c.usernameLabel}</label><input id="controlled-username" required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} /></div>
      <div><label className={labelClass} htmlFor="controlled-email">{c.emailLabel}</label><input id="controlled-email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></div>
      <div><label className={labelClass} htmlFor="controlled-password">{c.passwordLabel}</label><input id="controlled-password" required type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></div>
      <div><label className={labelClass} htmlFor="controlled-confirm">{c.confirmPasswordLabel}</label><input id="controlled-confirm" required type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} /></div>
      <button type="submit" className="button-primary" disabled={submitting || !isLoaded}>{submitting ? c.submittingButton : c.submitButton}</button>
    </form>}
    {stage === "verification" && <form onSubmit={verifyAndFinalize} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8"><label className={labelClass} htmlFor="controlled-code">{x.code}</label><input id="controlled-code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} /><button type="submit" className="button-primary" disabled={submitting || !code.trim()}>{x.verify}</button></form>}
    {error && <div role="alert" className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[.06] p-4 text-sm text-red-300">{error}</div>}
    {stage === "failed" && <button type="button" className="button-primary mt-4" onClick={() => window.location.reload()}>{x.retry}</button>}
    <p className="mt-6 text-xs text-white/40">{c.haveAccount} <Link className="font-semibold text-lime" href="/login">{c.haveAccountLinkLabel}</Link></p>
  </div>;
}

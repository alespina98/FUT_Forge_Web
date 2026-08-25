"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useI18n } from "./i18n-provider";

type Stage = "email" | "code" | "password";

const recoveryCopy = {
  en: {
    codeLabel: "Verification code",
    codeLead: "Enter the code Clerk sent to your email address.",
    codeButton: "Verify code",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    passwordLead: "Choose a new password for your FUT Forge account.",
    resetButton: "Reset password",
    genericError: "We couldn't complete that request. Check the details and try again.",
    mismatch: "The passwords do not match.",
    tooShort: "Use at least 8 characters.",
  },
  it: {
    codeLabel: "Codice di verifica",
    codeLead: "Inserisci il codice inviato da Clerk al tuo indirizzo email.",
    codeButton: "Verifica codice",
    newPassword: "Nuova password",
    confirmPassword: "Conferma password",
    passwordLead: "Scegli una nuova password per il tuo account FUT Forge.",
    resetButton: "Reimposta password",
    genericError: "Non è stato possibile completare la richiesta. Controlla i dati e riprova.",
    mismatch: "Le password non coincidono.",
    tooShort: "Usa almeno 8 caratteri.",
  },
} as const;

export function ClerkPasswordRecovery() {
  const { locale, t } = useI18n();
  const text = recoveryCopy[locale];
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      setStage("code");
    } catch {
      setError(text.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code: code.trim() });
      if (result.status !== "needs_new_password") throw new Error("Unexpected recovery state");
      setStage("password");
    } catch {
      setError(text.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    if (password.length < 8) {
      setError(text.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(text.mismatch);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn.resetPassword({ password });
      if (result.status !== "complete" || !result.createdSessionId) throw new Error("Unexpected recovery state");
      await setActive({ session: result.createdSessionId });
      router.replace("/app/account");
    } catch {
      setError(text.genericError);
      setSubmitting(false);
    }
  }

  const formClass = "glass mt-8 flex flex-col gap-4 rounded-2xl p-6 sm:p-8";
  const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-white/50";
  const inputClass = "min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none";

  return (
    <div className="mx-auto max-w-md">
      <p className="section-label">{t.auth.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">{t.forgotPassword.title}</h1>
      <p className="mt-4 text-sm leading-6 text-white/50">
        {stage === "email" ? t.forgotPassword.lead : stage === "code" ? text.codeLead : text.passwordLead}
      </p>

      {stage === "email" && (
        <form onSubmit={requestCode} className={formClass}>
          <label className={labelClass} htmlFor="clerk-recovery-email">{t.forgotPassword.emailLabel}</label>
          <input id="clerk-recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          <button type="submit" className="button-primary" disabled={!isLoaded || submitting || !email.trim()}>{submitting ? t.forgotPassword.submittingButton : t.forgotPassword.submitButton}</button>
        </form>
      )}

      {stage === "code" && (
        <form onSubmit={verifyCode} className={formClass}>
          <label className={labelClass} htmlFor="clerk-recovery-code">{text.codeLabel}</label>
          <input id="clerk-recovery-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value)} className={inputClass} />
          <button type="submit" className="button-primary" disabled={submitting || !code.trim()}>{text.codeButton}</button>
        </form>
      )}

      {stage === "password" && (
        <form onSubmit={resetPassword} className={formClass}>
          <label className={labelClass} htmlFor="clerk-recovery-password">{text.newPassword}</label>
          <input id="clerk-recovery-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
          <label className={labelClass} htmlFor="clerk-recovery-confirm">{text.confirmPassword}</label>
          <input id="clerk-recovery-confirm" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          <button type="submit" className="button-primary" disabled={submitting || !password || !confirmPassword}>{text.resetButton}</button>
        </form>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[.06] p-4 text-sm text-red-300" role="alert">{error}</div>}
      <p className="mt-6 text-xs leading-5 text-white/30"><Link href="/login" className="font-semibold text-lime hover:text-lime/80">{t.forgotPassword.backToLogin}</Link></p>
    </div>
  );
}

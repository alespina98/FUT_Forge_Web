"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn } from "@clerk/nextjs";
import { useI18n } from "./i18n-provider";
import { createClerkFlowCorrelationId, navigateToDecoratedUrl, reportClerkFlowDiagnostic } from "@/lib/auth/clerk-flow-diagnostics";

type Stage = "email" | "code" | "password" | "complete";

const recoveryCopy = {
  en: {
    codeLabel: "Verification code",
    codeLead: "Enter the code Clerk sent to your email address.",
    codeButton: "Verify code",
    upgradedLead: "Your FUT Forge account has been upgraded. Verify your email to create a new password.",
    passwordTitle: "Create your new password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    passwordLead: "Your email has been verified. Choose a password for your FUT Forge account.",
    resetButton: "Reset password",
    completingLead: "Password created. Finishing your secure sign-in…",
    genericError: "We couldn't complete that request. Check the details and try again.",
    invalidCode: "That verification code is invalid or has expired. Request a new code and try again.",
    weakPassword: "That password does not meet the security requirements. Choose a stronger password.",
    compromisedPassword: "That password has appeared in a data breach. Choose a different password.",
    rateLimited: "Too many attempts. Wait a moment and try again.",
    mismatch: "The passwords do not match.",
    tooShort: "Use at least 8 characters.",
  },
  it: {
    codeLabel: "Codice di verifica",
    codeLead: "Inserisci il codice inviato da Clerk al tuo indirizzo email.",
    codeButton: "Verifica codice",
    upgradedLead: "Il tuo account FUT Forge è stato aggiornato. Verifica la tua email per creare una nuova password.",
    passwordTitle: "Crea la tua nuova password",
    newPassword: "Nuova password",
    confirmPassword: "Conferma password",
    passwordLead: "La tua email è stata verificata. Scegli una password per il tuo account FUT Forge.",
    resetButton: "Reimposta password",
    completingLead: "Password creata. Completamento dell'accesso sicuro…",
    genericError: "Non è stato possibile completare la richiesta. Controlla i dati e riprova.",
    invalidCode: "Il codice di verifica non è valido o è scaduto. Richiedi un nuovo codice e riprova.",
    weakPassword: "La password non soddisfa i requisiti di sicurezza. Scegli una password più sicura.",
    compromisedPassword: "Questa password è comparsa in una violazione di dati. Scegline un'altra.",
    rateLimited: "Troppi tentativi. Attendi un momento e riprova.",
    mismatch: "Le password non coincidono.",
    tooShort: "Usa almeno 8 caratteri.",
  },
} as const;

type RecoveryCopy = (typeof recoveryCopy)[keyof typeof recoveryCopy];
type ClerkFlowError = { code?: string } | null | undefined;

function recoveryErrorMessage(error: ClerkFlowError, text: RecoveryCopy) {
  switch (error?.code) {
    case "form_code_incorrect":
    case "verification_expired":
      return text.invalidCode;
    case "form_password_pwned":
      return text.compromisedPassword;
    case "form_password_length_too_short":
    case "form_password_not_strong_enough":
      return text.weakPassword;
    case "too_many_requests":
      return text.rateLimited;
    default:
      return text.genericError;
  }
}

export function ClerkPasswordRecovery({ initialIdentifier = "", upgraded = false }: { initialIdentifier?: string; upgraded?: boolean }) {
  const { locale, t } = useI18n();
  const text = recoveryCopy[locale];
  const { signIn, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState(initialIdentifier);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    if (fetchStatus === "fetching") return;
    setSubmitting(true);
    setError(null);
    const correlationId = createClerkFlowCorrelationId();
    try {
      const { error: createError } = await signIn.create({ identifier: email.trim() });
      reportClerkFlowDiagnostic({ operation: "reset.create", correlationId, error: createError, signInStatus: signIn.status });
      if (createError) {
        setError(recoveryErrorMessage(createError, text));
        return;
      }
      const { error: sendCodeError } = await signIn.resetPasswordEmailCode.sendCode();
      reportClerkFlowDiagnostic({ operation: "reset.send_code", correlationId, error: sendCodeError, signInStatus: signIn.status });
      if (sendCodeError) {
        setError(recoveryErrorMessage(sendCodeError, text));
        return;
      }
      setStage("code");
    } catch {
      setError(text.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (fetchStatus === "fetching") return;
    setSubmitting(true);
    setError(null);
    const correlationId = createClerkFlowCorrelationId();
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      reportClerkFlowDiagnostic({ operation: "reset.verify_code", correlationId, error: verifyError, signInStatus: signIn.status });
      if (verifyError) {
        setError(recoveryErrorMessage(verifyError, text));
        return;
      }
      if (signIn.status !== "needs_new_password") throw new Error("Unexpected recovery state");
      setStage("password");
    } catch {
      setError(text.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (fetchStatus === "fetching") return;
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
    const correlationId = createClerkFlowCorrelationId();
    try {
      const { error: passwordError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      reportClerkFlowDiagnostic({ operation: "reset.submit_password", correlationId, error: passwordError, signInStatus: signIn.status });
      if (passwordError) {
        setError(recoveryErrorMessage(passwordError, text));
        setSubmitting(false);
        return;
      }
      if (signIn.status !== "complete") throw new Error("Unexpected recovery state");
      let finalizedDestination = "/app/account";
      const { error: finalizeError } = await signIn.finalize({ navigate: ({ decorateUrl, session }) => {
        finalizedDestination = decorateUrl(session.currentTask ? clerk.buildTasksUrl() : "/app/account");
      } });
      reportClerkFlowDiagnostic({ operation: "reset.finalize", correlationId, error: finalizeError, signInStatus: signIn.status, finalizeAttempted: true, finalizeFailed: Boolean(finalizeError) });
      if (finalizeError) throw new Error("Unable to activate recovered session");
      const completion = await fetch("/api/auth/clerk/complete-password-migration", { method: "POST" });
      if (!completion.ok) {
        await clerk.signOut();
        throw new Error("Unable to complete password migration state");
      }
      setStage("complete");
      navigateToDecoratedUrl(finalizedDestination, url => router.replace(url));
    } catch (caught) {
      const unexpected = caught instanceof Error ? { code: "unexpected_exception", message: caught.message } : { code: "unexpected_exception" };
      reportClerkFlowDiagnostic({ operation: "reset.complete", correlationId, error: unexpected, signInStatus: signIn.status });
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
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em]">
        {stage === "password" || stage === "complete" ? text.passwordTitle : t.forgotPassword.title}
      </h1>
      <p className="mt-4 text-sm leading-6 text-white/50">
        {stage === "email" ? upgraded ? text.upgradedLead : t.forgotPassword.lead : stage === "code" ? text.codeLead : stage === "password" ? text.passwordLead : text.completingLead}
      </p>

      {stage === "email" && (
        <form onSubmit={requestCode} className={formClass}>
          <label className={labelClass} htmlFor="clerk-recovery-email">{t.forgotPassword.emailLabel}</label>
          <input id="clerk-recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          <button type="submit" className="button-primary" disabled={fetchStatus === "fetching" || submitting || !email.trim()}>{submitting ? t.forgotPassword.submittingButton : t.forgotPassword.submitButton}</button>
        </form>
      )}

      {stage === "code" && (
        <form onSubmit={verifyCode} className={formClass}>
          <label className={labelClass} htmlFor="clerk-recovery-code">{text.codeLabel}</label>
          <input
            id="clerk-recovery-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${inputClass} text-center font-mono text-lg tracking-[.35em] tabular-nums`}
          />
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

      {stage === "complete" && <p className="mt-8 text-sm text-white/50" role="status">{text.completingLead}</p>}

      {error && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[.06] p-4 text-sm text-red-300" role="alert">{error}</div>}
      <p className="mt-6 text-xs leading-5 text-white/30"><Link href="/login" className="font-semibold text-lime hover:text-lime/80">{t.forgotPassword.backToLogin}</Link></p>
    </div>
  );
}

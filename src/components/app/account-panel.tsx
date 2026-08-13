"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserTier } from "@/lib/entitlements";
import { useAuthUser, getDisplayName } from "@/lib/use-auth-user";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function UsernameEditor() {
  const { t } = useI18n();
  const a = t.account;
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const username = value.trim();
    if (username.length < 3) return;
    setStatus("saving");
    const supabase = createSupabaseBrowserClient();
    // Same field registration writes at signup (Supabase user_metadata) -
    // no separate profile table involved, so Desktop/Browser Mode pick this
    // up immediately via futforge_auth.js's existing user_metadata fallback.
    const { error } = await supabase.auth.updateUser({ data: { username } });
    setStatus(error ? "error" : "saved");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs leading-5 text-white/40">{a.setUsernamePrompt}</p>
      <div className="flex gap-2">
        <input
          type="text"
          required
          minLength={3}
          maxLength={32}
          placeholder={a.usernamePlaceholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
        />
        <button type="submit" className="button-primary shrink-0 !min-h-11 !px-4 text-xs" disabled={status === "saving" || value.trim().length < 3}>
          {status === "saving" ? a.savingUsernameButton : a.saveUsernameButton}
        </button>
      </div>
      {status === "saved" && <p className="text-xs text-lime">{a.usernameSaved}</p>}
      {status === "error" && <p className="text-xs text-red-300">{a.usernameSaveError}</p>}
    </form>
  );
}

export function AccountPanel() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, user } = useAuthUser();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  if (status === "loading") return null;

  if (status === "signedOut") {
    return (
      <div className="mx-auto max-w-md">
        <p className="section-label">{t.account.eyebrow}</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">{t.account.title}</h1>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <p className="text-sm leading-6 text-white/60">{t.auth.lead}</p>
          <Link href="/app/login?next=/app/account" className="button-primary mt-6 inline-flex">
            {t.nav.login}
          </Link>
        </div>
      </div>
    );
  }

  const tier = getUserTier(user);
  const hasUsername = !!(user?.user_metadata as { username?: string } | undefined)?.username;

  return (
    <div className="mx-auto max-w-md">
      <p className="section-label">{t.account.eyebrow}</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">{t.account.title}</h1>

      <div className="glass mt-8 flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{t.account.usernameLabel}</p>
          {hasUsername ? <p className="mt-1 text-sm text-white">{getDisplayName(user)}</p> : <div className="mt-2"><UsernameEditor /></div>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{t.account.emailLabel}</p>
          <p className="mt-1 text-sm text-white">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{t.account.statusLabel}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_8px_var(--lime)]" />
            {t.account.statusActive}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{t.account.tierLabel}</p>
          <p className="mt-1 text-sm text-white">{tier === "premium" ? "Premium" : t.account.tierFree}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{t.account.browserModeLabel}</p>
          <p className="mt-1 text-sm text-lime">{t.account.browserModeStatus}</p>
        </div>
        <p className="text-xs leading-5 text-white/30">{t.account.tierNote}</p>

        <button type="button" onClick={handleLogout} className="button-secondary mt-2 self-start">
          {t.auth.logoutButton}
        </button>
      </div>
    </div>
  );
}

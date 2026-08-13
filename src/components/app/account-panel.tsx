"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getUserTier } from "@/lib/entitlements";
import { useAuthUser } from "@/lib/use-auth-user";

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

  return (
    <div className="mx-auto max-w-md">
      <p className="section-label">{t.account.eyebrow}</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">{t.account.title}</h1>

      <div className="glass mt-8 flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
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

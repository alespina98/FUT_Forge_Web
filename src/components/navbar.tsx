"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRODUCT } from "@/lib/copy";
import { useI18n } from "./i18n-provider";
import { DownloadIcon, ForgeMark, UserIcon } from "./icons";
import { leaksCopy } from "@/lib/leaks/copy";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/use-auth-user";

function NavAccount({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, user } = useAuthUser();

  if (status === "loading") return null;

  if (status === "signedOut") {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/app/login" onClick={onNavigate} className="font-semibold text-white/70 hover:text-white">
          {t.nav.login}
        </Link>
        <Link href="/app/register" onClick={onNavigate} className="rounded-full bg-lime px-4 py-2 text-xs font-bold uppercase tracking-[.04em] text-ink hover:bg-lime/85">
          {t.nav.register}
        </Link>
      </div>
    );
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    onNavigate?.();
    router.refresh();
    router.push("/");
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href="/app/account"
        onClick={onNavigate}
        className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-lime/30 hover:text-white"
        aria-label={t.nav.account}
      >
        <UserIcon className="size-3.5 shrink-0 text-lime" />
        <span className="truncate">{user?.email}</span>
      </Link>
      <button type="button" onClick={handleLogout} className="text-xs font-semibold text-white/50 hover:text-white">
        {t.auth.logoutButton}
      </button>
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const links = [
    [t.nav.features, "/#features"],
    [t.nav.roadmap, "/#roadmap"],
    [t.nav.download, "/download"],
    [t.nav.app, "/app"],
    [leaksCopy[locale].nav, "/app/leaks"],
  ] as const;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav className="glass nav-shell mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3 sm:px-5" aria-label={t.nav.aria}>
        <Link href="/" className="brand-lockup" aria-label={t.nav.home}><ForgeMark /><span>{PRODUCT.wordmark[0]}<span>{PRODUCT.wordmark[1]}</span></span><i>{t.nav.desktop}</i></Link>
        <div className="nav-center hidden items-center gap-1 text-sm text-white/60 md:flex">
          {links.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </div>
        <div className="nav-actions">
          <div className="language-switcher desktop-language" role="group" aria-label={t.nav.language}>
            {(["en", "it"] as const).map((item) => (
              <button key={item} type="button" className={locale === item ? "active" : ""} onClick={() => setLocale(item)} aria-pressed={locale === item}>
                {item.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="hidden md:block"><NavAccount /></div>
          <a href="/download" className="button-primary nav-download !min-h-11 !px-3 text-sm"><DownloadIcon className="size-4" /><span className="nav-cta-full">{t.nav.cta}</span><span className="nav-cta-short">{t.nav.download}</span></a>
          <button className={`menu-button ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t.nav.close : t.nav.open}><span /><span /></button>
        </div>
        {open && <div id="mobile-navigation" className="glass mobile-menu absolute left-3 right-3 top-[64px] flex flex-col rounded-2xl p-2 lg:hidden">{links.map(([label, href], index) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}<span>0{index + 1}</span></a>)}<div className="mt-1 border-t border-white/10 px-3 py-3"><NavAccount onNavigate={() => setOpen(false)} /></div><div className="mobile-language" role="group" aria-label={t.nav.language}><span>{t.nav.language}</span>{(["en", "it"] as const).map((item) => <button key={item} type="button" className={locale === item ? "active" : ""} onClick={() => { setLocale(item); setOpen(false); }} aria-pressed={locale === item}>{item.toUpperCase()} · {item === "en" ? "English" : "Italiano"}</button>)}</div></div>}
      </nav>
    </header>
  );
}


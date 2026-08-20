"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRODUCT } from "@/lib/copy";
import { useI18n } from "./i18n-provider";
import { ChevronDownIcon, DownloadIcon, ExitIcon, ForgeMark, UserIcon } from "./icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthUser, getDisplayName } from "@/lib/use-auth-user";

function NavAccount({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, user } = useAuthUser();

  if (status === "loading") return null;

  if (status === "signedOut") {
    return (
      <div className="flex min-w-0 shrink-0 items-center gap-2 text-sm">
        <Link href="/login" onClick={onNavigate} className="whitespace-nowrap font-semibold text-white/70 hover:text-white">
          {t.nav.login}
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
    <div className="flex min-w-0 shrink-0 items-center gap-1.5 text-sm">
      <Link
        href="/app/account"
        onClick={onNavigate}
        className="flex min-w-0 max-w-[128px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-lime/30 hover:text-white"
        aria-label={t.nav.account}
      >
        <UserIcon className="size-3.5 shrink-0 text-lime" />
        <span className="truncate">{getDisplayName(user)}</span>
      </Link>
      <button type="button" onClick={handleLogout} className="shrink-0 rounded-full p-2 text-white/50 hover:text-white" aria-label={t.auth.logoutButton} title={t.auth.logoutButton}>
        <ExitIcon className="size-4" />
      </button>
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  const featuresMenu = [
    [t.nav.featuresOverview, "/features", t.featuresPage.title],
    [t.nav.evoLab, "/features/evo-lab", t.evoLabPage.lead],
    [t.nav.sbc, "/features/sbc", t.sbcPage.lead],
  ] as const;
  const flatLinks = [
    [t.nav.platforms, "/download"],
    [t.nav.howItWorks, "/how-it-works"],
    [t.nav.faq, "/faq"],
  ] as const;
  const mobileLinks = [
    [t.nav.featuresOverview, "/features"],
    [t.nav.evoLab, "/features/evo-lab"],
    [t.nav.sbc, "/features/sbc"],
    ...flatLinks,
  ] as const;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav className="glass nav-shell mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-2xl px-4 py-3 sm:px-5" aria-label={t.nav.aria}>
        <Link href="/" className="brand-lockup min-w-0 shrink-0" aria-label={t.nav.home}><ForgeMark /><span>{PRODUCT.wordmark[0]}<span>{PRODUCT.wordmark[1]}</span></span><i>{t.nav.desktop}</i></Link>
        <div className="nav-center hidden min-w-0 items-center justify-center gap-1 text-sm text-white/60 md:flex">
          <div className="nav-dropdown">
            <button type="button">{t.nav.features}<ChevronDownIcon className="nav-dropdown-chevron size-3.5" /></button>
            <div className="glass nav-dropdown-menu">
              {featuresMenu.map(([label, href, description]) => (
                <Link key={href} href={href}><b>{label}</b><span>{description}</span></Link>
              ))}
            </div>
          </div>
          {flatLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </div>
        <div className="nav-actions min-w-0 justify-self-end">
          <div className="language-switcher desktop-language" role="group" aria-label={t.nav.language}>
            {(["en", "it"] as const).map((item) => (
              <button key={item} type="button" className={locale === item ? "active" : ""} onClick={() => setLocale(item)} aria-pressed={locale === item}>
                {item.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Same visibility rule as .desktop-language (only past the 1024px
              breakpoint where .nav-center's links also reappear, see
              globals.css) - showing this earlier is what left it fighting
              nav-center + nav-download for space in the 768-1023px band. */}
          <div className="desktop-account"><NavAccount /></div>
          <a href="/download" className="button-primary nav-download !min-h-11 !px-3 text-sm"><DownloadIcon className="size-4" /><span className="nav-cta-full">{t.nav.cta}</span><span className="nav-cta-short">{t.nav.download}</span></a>
          <button className={`menu-button ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t.nav.close : t.nav.open}><span /><span /></button>
        </div>
        {open && <div id="mobile-navigation" className="glass mobile-menu absolute left-3 right-3 top-[64px] flex flex-col rounded-2xl p-2 lg:hidden">{mobileLinks.map(([label, href], index) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}<span>0{index + 1}</span></a>)}<div className="mt-1 border-t border-white/10 px-3 py-3"><NavAccount onNavigate={() => setOpen(false)} /></div><div className="mobile-language" role="group" aria-label={t.nav.language}><span>{t.nav.language}</span>{(["en", "it"] as const).map((item) => <button key={item} type="button" className={locale === item ? "active" : ""} onClick={() => { setLocale(item); setOpen(false); }} aria-pressed={locale === item}>{item.toUpperCase()} · {item === "en" ? "English" : "Italiano"}</button>)}</div></div>}
      </nav>
    </header>
  );
}

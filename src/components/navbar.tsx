"use client";

import { useState } from "react";
import Link from "next/link";
import { PRODUCT } from "@/lib/copy";
import { useI18n } from "./i18n-provider";
import { DownloadIcon, ForgeMark } from "./icons";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const links = [
    [t.nav.features, "/#features"],
    [t.nav.roadmap, "/#roadmap"],
    [t.nav.download, "/download"],
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
          <a href="/download" className="button-primary nav-download !min-h-11 !px-3 text-sm"><DownloadIcon className="size-4" /><span className="nav-cta-full">{t.nav.cta}</span><span className="nav-cta-short">{t.nav.download}</span></a>
          <button className={`menu-button ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t.nav.close : t.nav.open}><span /><span /></button>
        </div>
        {open && <div id="mobile-navigation" className="glass mobile-menu absolute left-3 right-3 top-[64px] flex flex-col rounded-2xl p-2 lg:hidden">{links.map(([label, href], index) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}<span>0{index + 1}</span></a>)}<div className="mobile-language" role="group" aria-label={t.nav.language}><span>{t.nav.language}</span>{(["en", "it"] as const).map((item) => <button key={item} type="button" className={locale === item ? "active" : ""} onClick={() => { setLocale(item); setOpen(false); }} aria-pressed={locale === item}>{item.toUpperCase()} · {item === "en" ? "English" : "Italiano"}</button>)}</div></div>}
      </nav>
    </header>
  );
}



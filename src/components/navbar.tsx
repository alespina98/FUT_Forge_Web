"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { PRODUCT } from "@/lib/copy";
import type { Dictionary } from "@/lib/copy";
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

// Permanent home for FC27 sub-sections (News/Players/Squad Builder today,
// more later) - a real JS-controlled dropdown, not the hover/focus-within
// CSS-only mechanism Features uses, because this one has explicit
// requirements (Enter/Space opens via native button + focus-within;
// Escape and click-outside both close) that plain hover doesn't cover.
// Visually still reuses .nav-dropdown/.nav-dropdown-menu for parity with
// Features - only an additional class + this component's own state decide
// when the menu is forced open beyond what hover/focus-within already do.
function Fc27NavDropdown({ t, pathname }: { t: Dictionary; pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = pathname?.startsWith("/fc27") ?? false;

  // .nav-center scrolls horizontally (overflow-x:auto), which per the CSS
  // overflow spec forces overflow-y to auto too - any absolutely positioned
  // dropdown nested inside it gets clipped no matter what overflow-y is set
  // to explicitly. Rendering the menu through a portal at the very end of
  // <body>, fixed-positioned from the trigger's measured rect, is the only
  // way to escape that clip (this affects the pre-existing Features dropdown
  // too, but fixing that is out of scope here - this only changes this menu).
  // The portal also detaches the menu from .nav-dropdown's DOM subtree, so
  // the CSS-only :hover/:focus-within reveal Features relies on can't reach
  // it - hover open/close is reimplemented in JS below for parity.
  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 10, left: rect.left });
    }
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  const items = [
    [t.nav.fc27News, "/fc27/news"],
    [t.nav.players, "/fc27/players"],
    [t.nav.fc27Browse, "/fc27/browse"],
    [t.nav.fc27Compare, "/fc27/compare"],
    [t.nav.fc27Rankings, "/fc27/rankings"],
    [t.nav.fc27StatFinder, "/fc27/stat-finder"],
    [t.nav.fc27HiddenGems, "/fc27/hidden-gems"],
    [t.nav.fc27SquadBuilder, "/fc27/squad-builder"],
  ] as const;
  const itemActive = (href: string) => pathname === href || href === "/fc27/browse" && ["/fc27/nations", "/fc27/clubs", "/fc27/leagues"].some((base) => pathname === base || pathname?.startsWith(`${base}/`));

  const menu = (
    <div
      ref={menuRef}
      className={`glass nav-dropdown-menu${open ? " nav-dropdown-menu-open" : ""}`}
      role="menu"
      style={menuPos ? { position: "fixed", top: menuPos.top, left: menuPos.left } : undefined}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={scheduleClose}
    >
      {items.map(([label, href]) => (
        <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className={itemActive(href) ? "nav-dropdown-item-active" : ""} aria-current={itemActive(href) ? "page" : undefined}>
          <b>{label}</b>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="nav-dropdown" ref={ref} onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openMenu}
        className={active ? "nav-dropdown-trigger-active" : ""}
      >
        {t.nav.fc27}<ChevronDownIcon className="nav-dropdown-chevron size-3.5" />
      </button>
      {typeof document !== "undefined" ? createPortal(menu, document.body) : menu}
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const fc27Active = pathname?.startsWith("/fc27") ?? false;
  const [fc27MobileOpen, setFc27MobileOpen] = useState(fc27Active);

  const featuresMenu = [
    [t.nav.featuresOverview, "/features", t.featuresPage.title],
    [t.nav.evoLab, "/features/evo-lab", t.evoLabPage.lead],
    [t.nav.sbc, "/features/sbc", t.sbcPage.lead],
  ] as const;
  const flatLinks = [
    [t.nav.platforms, "/download"],
    [t.nav.howItWorks, "/how-it-works"],
    [t.nav.faq, "/faq"],
    [t.nav.partners, "/partners"],
  ] as const;
  const fc27MobileItems = [
    [t.nav.fc27News, "/fc27/news"],
    [t.nav.players, "/fc27/players"],
    [t.nav.fc27Browse, "/fc27/browse"],
    [t.nav.fc27Compare, "/fc27/compare"],
    [t.nav.fc27Rankings, "/fc27/rankings"],
    [t.nav.fc27StatFinder, "/fc27/stat-finder"],
    [t.nav.fc27HiddenGems, "/fc27/hidden-gems"],
    [t.nav.fc27SquadBuilder, "/fc27/squad-builder"],
  ] as const;
  const fc27ItemActive = (href: string) => pathname === href || href === "/fc27/browse" && ["/fc27/nations", "/fc27/clubs", "/fc27/leagues"].some((base) => pathname === base || pathname?.startsWith(`${base}/`));
  const mobileLinks = [
    [t.nav.featuresOverview, "/features"],
    [t.nav.evoLab, "/features/evo-lab"],
    [t.nav.sbc, "/features/sbc"],
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
          <Fc27NavDropdown t={t} pathname={pathname} />
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
        {open && (
          <div id="mobile-navigation" className="glass mobile-menu absolute left-3 right-3 top-[64px] flex flex-col rounded-2xl p-2 lg:hidden">
            {mobileLinks.map(([label, href], index) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}<span>0{index + 1}</span></a>)}
            <div className="mobile-menu-group">
              <button type="button" className={`mobile-menu-accordion-trigger${fc27Active ? " active" : ""}`} onClick={() => setFc27MobileOpen((v) => !v)} aria-expanded={fc27MobileOpen}>
                {t.nav.fc27}
                <ChevronDownIcon className={`size-3.5 transition-transform ${fc27MobileOpen ? "rotate-180" : ""}`} />
              </button>
              {fc27MobileOpen && (
                <div className="mobile-menu-accordion-panel">
                  {fc27MobileItems.map(([label, href]) => (
                    <a key={href} href={href} onClick={() => setOpen(false)} className={fc27ItemActive(href) ? "active" : ""} aria-current={fc27ItemActive(href) ? "page" : undefined}>{label}</a>
                  ))}
                </div>
              )}
            </div>
            {flatLinks.map(([label, href], index) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}<span>0{index + 4}</span></a>)}
            <div className="mt-1 border-t border-white/10 px-3 py-3"><NavAccount onNavigate={() => setOpen(false)} /></div>
            <div className="mobile-language" role="group" aria-label={t.nav.language}><span>{t.nav.language}</span>{(["en", "it"] as const).map((item) => <button key={item} type="button" className={locale === item ? "active" : ""} onClick={() => { setLocale(item); setOpen(false); }} aria-pressed={locale === item}>{item.toUpperCase()} · {item === "en" ? "English" : "Italiano"}</button>)}</div>
          </div>
        )}
      </nav>
    </header>
  );
}

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
import { useAuthUser, useOwnProfile, getDisplayName } from "@/lib/use-auth-user";
import { ThemeControl } from "./theme-control";
import { useClerk, useUser } from "@clerk/nextjs";
import { useAuthMode } from "./app-auth-context";

function ClerkNavAccount({ onNavigate }: { onNavigate?: () => void }) {
  const {t}=useI18n();const router=useRouter();const {isLoaded,isSignedIn,user}=useUser();const {signOut}=useClerk();
  const [role,setRole]=useState<"USER"|"ADMIN"|null>(null);
  useEffect(()=>{if(!isLoaded||!isSignedIn)return;const controller=new AbortController();fetch("/api/auth/profile",{cache:"no-store",signal:controller.signal}).then(response=>response.ok?response.json():null).then((profile:{role?:unknown}|null)=>{if(!controller.signal.aborted)setRole(profile?.role==="ADMIN"?"ADMIN":"USER")}).catch(()=>{if(!controller.signal.aborted)setRole(null)});return()=>controller.abort()},[isLoaded,isSignedIn]);
  if(!isLoaded)return null;if(!isSignedIn)return <div className="flex min-w-0 shrink-0 items-center gap-2 text-sm"><Link prefetch={false} href="/login" onClick={onNavigate} className="whitespace-nowrap font-semibold text-white/70 hover:text-white">{t.nav.login}</Link></div>;
  const name=user.username||user.fullName||user.primaryEmailAddress?.emailAddress.split("@")[0]||"Account";
  return <div className="flex min-w-0 shrink-0 items-center gap-1.5 text-sm">{role==="ADMIN"&&<Link prefetch={false} href="/app/admin" onClick={onNavigate} className="admin-nav-link">Admin</Link>}<Link prefetch={false} href="/app/account" onClick={onNavigate} className="flex min-w-0 max-w-[128px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs font-semibold text-white/80"><UserIcon className="size-3.5 shrink-0 text-lime"/><span className="truncate">{name}</span></Link><button type="button" onClick={async()=>{await signOut();onNavigate?.();router.push("/")}} className="shrink-0 rounded-full p-2 text-white/50 hover:text-white" aria-label={t.auth.logoutButton}><ExitIcon className="size-4"/></button></div>
}
function SupabaseNavAccount({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, user } = useAuthUser();
  const profile = useOwnProfile(status === "signedIn" ? user?.id : null);

  if (status === "loading") return null;

  if (status === "signedOut") {
    return (
      <div className="flex min-w-0 shrink-0 items-center gap-2 text-sm">
        <Link prefetch={false} href="/login" onClick={onNavigate} className="whitespace-nowrap font-semibold text-white/70 hover:text-white">
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
      {profile?.role === "ADMIN" && <Link prefetch={false} href="/app/admin" onClick={onNavigate} className="admin-nav-link">Admin</Link>}
      <Link prefetch={false}
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
function NavAccount(props:{onNavigate?:()=>void}){return useAuthMode()==="clerk"?<ClerkNavAccount {...props}/>:<SupabaseNavAccount {...props}/>}

// Player discovery uses a click-controlled portal so the menu escapes the
// horizontally scrollable desktop nav while retaining keyboard and outside-
// click behavior.
function isPlayersRoute(pathname: string | null) {
  if (!pathname) return false;
  return ["/fc27/players", "/fc27/meta-rankings", "/fc27/rankings", "/fc27/positions", "/fc27/best", "/fc27/stat-finder", "/fc27/hidden-gems", "/fc27/nations", "/fc27/clubs", "/fc27/leagues", "/fc27/similar", "/fc27/compare", "/fc27/squad-builder", "/fc27/browse"]
    .some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

function playersMenuGroups(t: Dictionary) {
  return [
    { label: t.nav.navCore, items: [[t.nav.playersDatabase, "/fc27/players"], [t.nav.baseMetaRankings, "/fc27/meta-rankings"], [t.nav.fc27Rankings, "/fc27/rankings"]] },
    { label: t.nav.navDiscovery, items: [[t.nav.bestByPosition, "/fc27/positions"], [t.nav.fc27StatFinder, "/fc27/stat-finder"], [t.nav.fc27HiddenGems, "/fc27/hidden-gems"]] },
    { label: t.nav.navExploreDatabase, items: [[t.nav.nations, "/fc27/nations"], [t.nav.clubs, "/fc27/clubs"], [t.nav.leagues, "/fc27/leagues"]] },
    { label: t.nav.navTools, items: [[t.nav.fc27Compare, "/fc27/compare"], [t.nav.fc27SquadBuilder, "/fc27/squad-builder"]] },
  ] as const;
}

function Fc27NavDropdown({ t, pathname }: { t: Dictionary; pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = isPlayersRoute(pathname);

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
      const menuWidth = 780;
      setMenuPos({ top: rect.bottom + 10, left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)) });
    }
    setOpen(true);
    window.requestAnimationFrame(() => menuRef.current?.querySelector("a")?.focus());
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
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);
  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const groups = playersMenuGroups(t);
  const itemActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`) || href === "/fc27/positions" && pathname?.startsWith("/fc27/best/");

  const menu = (
    <div
      ref={menuRef}
      id="desktop-players-menu"
      className={`glass nav-dropdown-menu players-mega-menu${open ? " nav-dropdown-menu-open" : ""}`}
      role="menu"
      style={menuPos ? { position: "fixed", top: menuPos.top, left: menuPos.left } : undefined}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={scheduleClose}
    >
      {groups.map((group) => <section key={group.label} className="players-mega-group"><h2>{group.label}</h2>{group.items.map(([label,href]) => <Link prefetch={false} key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className={itemActive(href) ? "nav-dropdown-item-active" : ""} aria-current={itemActive(href) ? "page" : undefined}><b>{label}</b></Link>)}</section>)}
    </div>
  );

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="desktop-players-menu"
        onClick={() => open ? setOpen(false) : openMenu()}
        className={active ? "nav-dropdown-trigger-active" : ""}
      >
        {t.nav.fc27}<ChevronDownIcon className={`nav-dropdown-chevron size-3.5 ${open ? "rotate-180" : ""}`} />
      </button>
      {typeof document !== "undefined" ? createPortal(menu, document.body) : menu}
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const pathname = usePathname();
  const playersActive = isPlayersRoute(pathname);
  const [playersMobileOpen, setPlayersMobileOpen] = useState(playersActive);

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
  const playerGroups = playersMenuGroups(t);
  const playerItemActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`) || href === "/fc27/positions" && pathname?.startsWith("/fc27/best/");
  const mobileLinks = [
    [t.nav.featuresOverview, "/features"],
    [t.nav.evoLab, "/features/evo-lab"],
    [t.nav.sbc, "/features/sbc"],
  ] as const;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav className="glass nav-shell mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-2xl px-4 py-3 sm:px-5" aria-label={t.nav.aria}>
        <Link prefetch={false} href="/" className="brand-lockup min-w-0 shrink-0" aria-label={t.nav.home}><ForgeMark /><span>{PRODUCT.wordmark[0]}<span>{PRODUCT.wordmark[1]}</span></span><i>{t.nav.desktop}</i></Link>
        <div className="nav-center hidden min-w-0 items-center justify-center gap-1 text-sm text-white/60 md:flex">
          <div className="nav-dropdown">
            <button type="button">{t.nav.features}<ChevronDownIcon className="nav-dropdown-chevron size-3.5" /></button>
            <div className="glass nav-dropdown-menu">
              {featuresMenu.map(([label, href, description]) => (
                <Link prefetch={false} key={href} href={href}><b>{label}</b><span>{description}</span></Link>
              ))}
            </div>
          </div>
          {flatLinks.map(([label, href]) => <Link prefetch={false} key={href} href={href}>{label}</Link>)}
          <Fc27NavDropdown t={t} pathname={pathname} />
        </div>
        <div className="nav-actions min-w-0 justify-self-end">
          <div className="desktop-theme"><ThemeControl locale={locale} /></div>
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
              <button type="button" className={`mobile-menu-accordion-trigger${playersActive ? " active" : ""}`} onClick={() => setPlayersMobileOpen((v) => !v)} aria-expanded={playersMobileOpen} aria-controls="mobile-players-menu">
                {t.nav.fc27}
                <ChevronDownIcon className={`size-3.5 transition-transform ${playersMobileOpen ? "rotate-180" : ""}`} />
              </button>
              {playersMobileOpen && (
                <div id="mobile-players-menu" className="mobile-menu-accordion-panel">
                  {playerGroups.map((group) => (
                    <section key={group.label} className="mobile-players-group">
                      <h3>{group.label}</h3>
                      {group.items.map(([label, href]) => (
                        <a key={href} href={href} onClick={() => setOpen(false)} className={playerItemActive(href) ? "active" : ""} aria-current={playerItemActive(href) ? "page" : undefined}>{label}</a>
                      ))}
                    </section>
                  ))}
                </div>
              )}
            </div>
            {flatLinks.map(([label, href], index) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}<span>0{index + 4}</span></a>)}
            <div className="mt-1 border-t border-white/10 px-3 py-3"><NavAccount onNavigate={() => setOpen(false)} /></div>
            <ThemeControl mobile locale={locale} />
            <div className="mobile-language" role="group" aria-label={t.nav.language}><span>{t.nav.language}</span>{(["en", "it"] as const).map((item) => <button key={item} type="button" className={locale === item ? "active" : ""} onClick={() => { setLocale(item); setOpen(false); }} aria-pressed={locale === item}>{item.toUpperCase()} · {item === "en" ? "English" : "Italiano"}</button>)}</div>
          </div>
        )}
      </nav>
    </header>
  );
}

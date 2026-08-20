"use client";

import { PRODUCT } from "@/lib/copy";
import Link from "next/link";
import { ForgeMark } from "./icons";
import { useI18n } from "./i18n-provider";

const INSTAGRAM_URL = "https://www.instagram.com/futforgeofficial/";
const INSTANT_GAMING_URL = "https://www.instant-gaming.com/?igr=futforge";

export function Footer() {
  const { t } = useI18n();
  const p = t.partners;

  const product = [
    [t.footer.features, "/features"],
    [t.footer.evoLab, "/features/evo-lab"],
    [t.footer.sbc, "/features/sbc"],
    [t.footer.platforms, "/download"],
    [t.footer.howItWorks, "/how-it-works"],
  ] as const;
  const support = [
    [t.footer.faq, "/faq"],
  ] as const;
  const legal = [
    [t.footer.privacy, "/privacy"],
  ] as const;

  return (
    <footer data-reveal className="section-reveal border-t border-white/[.07] px-4 py-9 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight" aria-label={t.nav.home}><ForgeMark />{PRODUCT.wordmark[0]}<span className="-ml-2.5 text-lime">{PRODUCT.wordmark[1]}</span></Link>
          <p className="mt-3 max-w-[26ch] text-xs leading-6 text-white/40">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="section-label">{t.footer.productLabel}</p>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-white/45">{product.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
        </div>
        <div>
          <p className="section-label">{t.footer.supportLabel}</p>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-white/45">
            {support.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
            <li><a href="mailto:futforge@proton.me">{t.footer.contact}</a></li>
          </ul>
        </div>
        <div>
          <p className="section-label">{t.footer.legalLabel}</p>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-white/45">{legal.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
        </div>
        <div>
          <p className="section-label">{t.footer.partnersLabel}</p>
          <ul className="mt-3 flex flex-col gap-2 text-xs text-white/45">
            <li><a href={INSTANT_GAMING_URL} target="_blank" rel="noopener noreferrer sponsored">{p.instantGaming.name}</a></li>
            {/* No MMOEXP URL was provided (only the FUTFORGE discount code) -
                shown as plain text rather than guessing a destination. */}
            <li>{p.mmoexp.name} <span className="text-white/25">· FUTFORGE</span></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-7 flex max-w-7xl flex-col gap-3 border-t border-white/[.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-white/40">
          <span>{t.footer.contactLabel}: <a href="mailto:futforge@proton.me" className="text-white/55">futforge@proton.me</a></span>
          <span className="hidden sm:inline">·</span>
          <span>futforgeofficial.com</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-white/45">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://github.com/alespina98/FUT_Forge_Releases" target="_blank" rel="noopener noreferrer" aria-label={t.footer.githubAria}>{t.footer.github}</a>
        </div>
      </div>
      <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-2 border-t border-white/[.06] pt-5 text-[10px] text-white/30 sm:flex-row sm:justify-between"><span>{t.footer.rights}</span><span>{t.footer.disclaimer}</span></div>
    </footer>
  );
}

"use client";

import { PRODUCT } from "@/lib/copy";
import { ForgeMark } from "./icons";
import { useI18n } from "./i18n-provider";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer data-reveal className="section-reveal border-t border-white/[.07] px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div><a href="#top" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight" aria-label={t.nav.home}><ForgeMark />{PRODUCT.wordmark[0]}<span className="-ml-2.5 text-lime">{PRODUCT.wordmark[1]}</span></a><p className="mt-4 text-xs text-white/40">{t.footer.tagline}</p></div>
        <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs text-white/45"><a href="#features">{t.footer.features}</a><a href="#roadmap">{t.footer.roadmap}</a><a href="#download">{t.footer.download}</a><a href={`mailto:${PRODUCT.email}`}>{t.footer.contact}</a></div>
      </div>
      <div className="mx-auto mt-9 flex max-w-7xl flex-col gap-2 border-t border-white/[.06] pt-6 text-[10px] text-white/30 sm:flex-row sm:justify-between"><span>{t.footer.rights}</span><span>{t.footer.disclaimer}</span></div>
    </footer>
  );
}


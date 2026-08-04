"use client";

import { useI18n } from "./i18n-provider";

export function Roadmap() {
  const { t } = useI18n();

  return (
    <section id="roadmap" className="section-shell section-reveal pb-28" data-reveal>
      <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
        <div><p className="section-label">{t.roadmap.label}</p><h2 className="section-title mt-5">{t.roadmap.title}<br /><span className="text-white/35">{t.roadmap.titleMuted}</span></h2><p className="mt-6 max-w-sm text-sm leading-6 text-white/45">{t.roadmap.body}</p></div>
        <div className="roadmap-list">{t.roadmap.steps.map((step, index) => <article key={step.phase} className="roadmap-item"><div className={`roadmap-dot ${index === 0 ? "active" : ""}`} /><div><span className="font-mono text-[10px] uppercase tracking-[.2em] text-lime/70">{step.phase}</span><h3 className="mt-2 text-lg font-medium">{step.title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-white/40">{step.text}</p></div><span className="ml-auto hidden font-mono text-xs text-white/15 sm:block">0{index + 1}</span></article>)}</div>
      </div>
    </section>
  );
}

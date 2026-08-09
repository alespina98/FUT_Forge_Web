"use client";

import Link from "next/link";
import { useI18n } from "../i18n-provider";

export function AppLandingContent() {
  const { t } = useI18n();
  const a = t.app.landing;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="section-label">{a.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
        {a.title} <span className="text-white/35">{a.titleMuted}</span>
      </h1>
      <p className="mt-5 max-w-xl text-sm leading-6 text-white/50 sm:text-base">{a.intro}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {a.tools.map((tool) =>
          tool.status === "available" ? (
            <Link
              key={tool.name}
              href={tool.href}
              className="glass flex flex-col gap-3 rounded-2xl p-5 transition hover:border-lime/30"
            >
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-lime">{tool.name}</span>
              <p className="text-sm leading-6 text-white/60">{tool.description}</p>
              <span className="mt-auto text-xs font-semibold text-lime">{a.openLabel} →</span>
            </Link>
          ) : (
            <div key={tool.name} className="glass flex flex-col gap-3 rounded-2xl p-5 opacity-50">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-white/40">{tool.name}</span>
              <p className="text-sm leading-6 text-white/40">{tool.description}</p>
              <span className="mt-auto text-xs font-semibold text-white/30">{a.soonLabel}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

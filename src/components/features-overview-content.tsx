"use client";

import Link from "next/link";
import { Arrow } from "./icons";
import { useI18n } from "./i18n-provider";

export function FeaturesOverviewIntro() {
  const { t } = useI18n();
  const f = t.featuresPage;

  return (
    <div className="hero-grid relative px-4 pb-4 pt-40 text-center sm:px-6 sm:pt-48">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="relative mx-auto max-w-4xl">
        <p className="section-label justify-center">{f.eyebrow}</p>
        <h1 className="section-title mt-5">{f.title}</h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/50 sm:text-base">{f.intro}</p>
      </div>
    </div>
  );
}

export function WebAppTools() {
  const { t } = useI18n();
  const f = t.featuresPage;

  return (
    <section className="section-shell !pt-0 section-reveal" data-reveal>
      <p className="section-label">{f.webAppLabel}</p>
      <h2 className="mt-4 max-w-xl text-2xl font-semibold tracking-[-.03em] sm:text-3xl">{f.webAppIntro}</h2>
      <div className="card-grid mt-10">
        {f.webAppTools.map((tool) => (
          <Link href={tool.href} className="nav-card" key={tool.href}>
            <h3>{tool.name}</h3>
            <p>{tool.description}</p>
            <Arrow className="size-4" />
          </Link>
        ))}
      </div>
    </section>
  );
}

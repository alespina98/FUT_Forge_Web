"use client";

import { useI18n } from "./i18n-provider";

export function FaqContent() {
  const { t } = useI18n();
  const f = t.faqPage;

  return (
    <div className="hero-grid relative px-4 pb-8 pt-40 text-center sm:px-6 sm:pt-48">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="relative mx-auto max-w-3xl">
        <h1 className="section-title">{f.title}</h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/50 sm:text-base">{f.subtitle}</p>
      </div>
      <section className="faq-section mx-auto max-w-3xl px-4 pb-24 pt-6 text-left sm:px-6">
        <div>
          {f.items.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<span aria-hidden>+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

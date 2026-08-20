"use client";

import { useI18n } from "./i18n-provider";

export function HowItWorksContent() {
  const { t } = useI18n();
  const h = t.howItWorksPage;

  return (
    <div className="hero-grid relative px-4 pb-24 pt-40 text-center sm:px-6 sm:pt-48">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="relative mx-auto max-w-4xl">
        <p className="section-label justify-center">{h.eyebrow}</p>
        <h1 className="section-title mt-5">{h.title}</h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/50 sm:text-base">{h.subtitle}</p>

        <div className="step-flow text-left">
          {h.steps.map((step, index) => (
            <div className="step-flow-item" key={step.title}>
              <span className="step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>

        <a href="/download" className="button-primary mt-14 inline-flex">{h.cta}</a>
      </div>
    </div>
  );
}

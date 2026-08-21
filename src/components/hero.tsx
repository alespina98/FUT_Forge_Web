"use client";

import { Arrow, DownloadIcon, ForgeMark, HeartIcon, LockIcon, SparkIcon } from "./icons";
import { useI18n } from "./i18n-provider";

const particleCount = 5;
const PAYPAL_URL = "https://www.paypal.com/ncp/payment/Y4L7JX8ZL8GUN";

export function Hero() {
  const { t } = useI18n();
  const h = t.home;

  return (
    <section id="top" className="home-hero relative overflow-hidden">
      <div className="hero-noise" />
      <div className="mx-auto grid home-hero-inner max-w-7xl px-4 sm:px-6">
        <div className="home-hero-copy reveal">
          <p className="home-hero-eyebrow"><SparkIcon className="size-3.5" />{h.eyebrow}</p>
          <h1 className="home-hero-title">
            <span>{h.headlineWhite}</span>
            <span className="text-gradient">{h.headlineLime}</span>
          </h1>
          <p className="home-hero-body">{h.body}</p>
          <div className="home-hero-actions">
            <a href="/download" className="button-primary"><DownloadIcon className="size-4.5" />{h.primaryCta}</a>
            <a href="/app" className="button-secondary">{h.secondaryCta}</a>
          </div>
          <p className="home-hero-platforms">{h.platformNote}</p>

          <div className="home-support-box reveal">
            <span className="home-support-icon" aria-hidden><HeartIcon className="size-4.5" /></span>
            <div className="home-support-copy">
              <p className="home-support-title">{h.support.title}</p>
              <p className="home-support-body">{h.support.body}</p>
              <p className="home-support-note"><LockIcon className="size-3" />{h.support.note}</p>
            </div>
            <a href={PAYPAL_URL} target="_blank" rel="noopener noreferrer" className="home-support-cta">
              {h.support.cta}<Arrow className="size-3.5" />
            </a>
          </div>
        </div>

        <div className="home-hero-visual reveal delay-2" aria-hidden="true">
          <div className="home-hero-visual-grid" />
          <div className="home-hero-visual-glow" />
          <span className="home-hero-ring home-hero-ring-a" />
          <span className="home-hero-ring home-hero-ring-b" />
          <div className="home-hero-mark"><ForgeMark /></div>
          {Array.from({ length: particleCount }, (_, index) => <span key={index} className="home-hero-particle" />)}
        </div>
      </div>
    </section>
  );
}

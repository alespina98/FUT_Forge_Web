"use client";

import { Arrow, DownloadIcon, SparkIcon } from "./icons";
import { useI18n } from "./i18n-provider";

export function Hero() {
  const { t } = useI18n();

  return (
    <section id="top" className="hero-grid hero-v2 relative px-4 pb-24 pt-36 sm:px-6 sm:pt-44 lg:pb-36">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" /><div className="hero-orb hero-orb-secondary" /><div className="hero-scan" />
      <div className="relative mx-auto max-w-7xl text-center">
        <div className="hero-release reveal"><span className="live-dot" /><SparkIcon className="size-4" /><span>{t.hero.release}</span><i />{t.hero.releaseNote}</div>
        <h1 className="hero-title hero-title-v2 mx-auto mt-9 max-w-[1180px] text-balance font-semibold">
          {t.hero.words.map((word, index) => <span key={word} className={`hero-line hero-line-${["build", "optimize", "dominate"][index]}`}><span className="line-index">0{index + 1}</span>{index === 2 ? <span className="text-gradient">{word}</span> : word}</span>)}
        </h1>
        <div className="hero-message reveal delay-2"><p>{t.hero.lead}</p><p>{t.hero.body}</p></div>
        <div className="hero-actions reveal delay-3">
          <a href="#download" className="button-primary hero-primary magnetic"><DownloadIcon className="size-5" /><span><b>{t.hero.primary}</b><small>{t.hero.primaryMeta}</small></span><span className="button-chip">{t.hero.free}</span></a>
          <a href="#features" className="button-secondary hero-secondary magnetic"><span><b>{t.hero.secondary}</b><small>{t.hero.secondaryMeta}</small></span><Arrow className="size-5" /></a>
        </div>
        <div className="hero-trust reveal delay-4">{t.hero.trust.map((item, index) => <span key={item}><i className={index === 0 ? "active" : ""} />{item}</span>)}</div>
        <div className="hero-proof reveal">{t.hero.proof.map(([value, label], index) => <div className="hero-proof-item" key={label}><div><strong>{value}</strong><span>{label}</span></div>{index < t.hero.proof.length - 1 && <i />}</div>)}</div>
      </div>
    </section>
  );
}

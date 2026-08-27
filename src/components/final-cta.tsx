"use client";

import { useI18n } from "./i18n-provider";
import { track } from "@/lib/analytics/client";

export function FinalCta() {
  const { t } = useI18n();
  const h = t.home;

  return (
    <section className="home-final section-reveal" data-reveal>
      <div className="dl-final mx-auto max-w-6xl px-4 sm:px-6">
        <h2>{h.finalTitle}</h2>
        <p className="dl-final-body">{h.finalBody}</p>
        <div className="dl-final-actions">
          <a href="/download" className="download-primary" onClick={() => track("cta_click", { cta: "download", location: "final_cta" })}>{h.primaryCta}</a>
          <a href="/register" className="download-primary download-secondary" onClick={() => track("cta_click", { cta: "register", location: "final_cta" })}>{h.finalSecondary}</a>
        </div>
      </div>
    </section>
  );
}

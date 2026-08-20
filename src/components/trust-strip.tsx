"use client";

import { BoltIcon, DevicesIcon, GiftIcon, TargetIcon } from "./icons";
import { useI18n } from "./i18n-provider";

const icons = [GiftIcon, DevicesIcon, TargetIcon, BoltIcon];

export function TrustStrip() {
  const { t } = useI18n();

  return (
    <section className="home-trust section-reveal" data-reveal aria-label="FUT Forge at a glance">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="home-trust-inner">
          {t.home.trust.map((item, index) => {
            const Icon = icons[index];
            return (
              <div className="home-trust-item" key={item.title}>
                <i><Icon className="size-3.5" /></i>
                <div><strong>{item.title}</strong><span>{item.body}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { Arrow, BoltIcon, DownloadIcon, RegisterIcon, RouteIcon, ShieldIcon, TargetIcon, ToolsIcon } from "./icons";
import { useI18n } from "./i18n-provider";

const icons = [RouteIcon, ToolsIcon, BoltIcon, TargetIcon, ShieldIcon, DownloadIcon, RegisterIcon];

export function ExploreSection() {
  const { t } = useI18n();

  return (
    <section className="home-explore section-reveal" data-reveal>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="section-label">{t.home.exploreLabel}</p>
        <h2 className="home-explore-title mt-2.5">{t.home.exploreTitle}</h2>
        <div className="explore-grid mt-6">
          {t.home.explore.map((item, index) => {
            const Icon = icons[index];
            return (
              <Link href={item.href} className="nav-card explore-card" key={item.href}>
                <i><Icon className="size-4" /></i>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <Arrow className="size-4" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

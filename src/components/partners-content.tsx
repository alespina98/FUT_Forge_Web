"use client";

import Image from "next/image";
import { useI18n } from "./i18n-provider";
import { TrophyIcon, UserIcon, ShieldIcon, BoltIcon, Arrow } from "./icons";
import { track } from "@/lib/analytics/client";

const highlightIcons = [UserIcon, ShieldIcon, BoltIcon, TrophyIcon];

export function PartnersContent() {
  const { t } = useI18n();
  const p = t.partnersPage;

  return (
    <div className="hero-grid relative px-4 pb-8 pt-40 text-center sm:px-6 sm:pt-48">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="relative mx-auto max-w-3xl">
        <p className="section-label">{p.eyebrow}</p>
        <h1 className="section-title mt-4">{p.title}</h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-white/50 sm:text-base">{p.subtitle}</p>
      </div>

      <section className="relative mx-auto mt-14 flex max-w-3xl flex-col gap-5 px-0 pb-20 text-left">
        {p.partners.map((partner) => (
          <a
            key={partner.name}
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-4 rounded-2xl border border-transparent bg-[linear-gradient(#0a0d0b,#0a0d0b)_padding-box,linear-gradient(120deg,#8b5cf6,#22d3ee)_border-box] p-5 shadow-[0_20px_60px_rgba(139,92,246,.12)] transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
            style={{ borderWidth: 1 }}
            onClick={() => track("partner_click", { cta: partner.name })}
          >
            <Image src={partner.logo} alt={partner.name} width={72} height={72} className="size-16 shrink-0 rounded-full sm:size-[72px]" />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-lg font-semibold tracking-[-.02em] text-white sm:text-xl">
                FUT Forge <span className="text-white/40">×</span> <span className="bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] bg-clip-text text-transparent">{partner.name}</span>
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-white/55">{partner.body}</p>
            </div>
            <span className="button-primary !min-h-11 shrink-0 whitespace-nowrap !bg-gradient-to-r !from-[#8b5cf6] !to-[#22d3ee] !text-white !shadow-none">
              {partner.cta}<Arrow className="size-4" />
            </span>
          </a>
        ))}
      </section>

      <section className="relative mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-20 text-left sm:px-6 md:grid-cols-4">
        {p.highlights.map((item, index) => {
          const Icon = highlightIcons[index % highlightIcons.length];
          return (
            <div key={item.title}>
              <Icon className="size-6 text-lime" />
              <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-white/45">{item.body}</p>
            </div>
          );
        })}
      </section>

      <section className="relative mx-auto max-w-xl pb-24 text-center">
        <h2 className="text-xl font-semibold tracking-[-.02em] text-white sm:text-2xl">{p.collabTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-white/50">{p.collabBody}</p>
        <a href={p.collabHref} className="button-secondary mt-6 inline-flex">{p.collabCta}</a>
      </section>
    </div>
  );
}

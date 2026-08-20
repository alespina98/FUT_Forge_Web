"use client";

import { CheckIcon } from "./icons";
import { DesktopFrame } from "./desktop-frame";
import { useI18n } from "./i18n-provider";

type Screenshot = { src: string; width: number; height: number; alt: string };

export function FeatureDetail({ page, screenshot, cta }: { page: "evoLabPage" | "sbcPage"; screenshot: Screenshot; cta: { href: string } }) {
  const { t } = useI18n();
  const d = t[page];

  return (
    <div className="section-shell relative pt-40 sm:pt-48">
      <div className="grid items-center gap-16 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="section-label">{d.eyebrow}</p>
          <h1 className="section-title mt-5">{d.title}</h1>
          <p className="mt-5 max-w-md text-lg font-medium text-white/80">{d.lead}</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/45">{d.body}</p>
          <ul className="mt-8 flex flex-col gap-3">
            {d.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-sm text-white/65">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-lime" />
                {bullet}
              </li>
            ))}
          </ul>
          {"disclaimer" in d && d.disclaimer && <p className="mt-6 max-w-md text-xs leading-5 text-white/30">{d.disclaimer}</p>}
          <a href={cta.href} className="button-primary mt-9 inline-flex">{d.cta}</a>
        </div>
        <DesktopFrame src={screenshot.src} alt={screenshot.alt} label={d.eyebrow} width={screenshot.width} height={screenshot.height} />
      </div>
    </div>
  );
}

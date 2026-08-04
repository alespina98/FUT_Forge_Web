"use client";

import type { ReleaseInfo } from "@/lib/release";
import { DownloadIcon } from "./icons";
import { useI18n } from "./i18n-provider";

function formatReleaseDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function DownloadSection({ release }: { release: ReleaseInfo }) {
  const { locale, t } = useI18n();
  const available = Boolean(release.downloadUrl);

  return (
    <section id="download" className="section-shell section-reveal" data-reveal>
      <div className="download-panel relative overflow-hidden rounded-[32px] px-6 py-16 text-center sm:px-12 sm:py-24">
        <div className="download-rings" />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[.22em] text-black/50">{t.download.label}</p>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold leading-none tracking-[-.055em] text-black sm:text-6xl">{t.download.title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-black/60 sm:text-base">{t.download.body}</p>
          <a href={release.downloadUrl ?? "#top"} className="download-cta mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-black px-6 font-semibold text-white transition hover:-translate-y-1 hover:bg-black/85" aria-label={available ? t.download.button : t.download.unavailable}>
            <DownloadIcon className="size-5" />{available ? t.download.button : t.download.unavailable}
          </a>
          <dl className="release-meta">
            <div><dt>{t.download.version}</dt><dd>{release.version}</dd></div>
            <div><dt>{t.download.filename}</dt><dd>{release.filename}</dd></div>
            {release.publishedAt && <div><dt>{t.download.released}</dt><dd>{formatReleaseDate(release.publishedAt, locale)}</dd></div>}
          </dl>
          <div className="mt-5 flex flex-wrap justify-center gap-3 text-[11px] text-black/50"><span>{t.download.platform}</span><span aria-hidden>·</span><span>{t.download.updates}</span></div>
        </div>
      </div>
    </section>
  );
}

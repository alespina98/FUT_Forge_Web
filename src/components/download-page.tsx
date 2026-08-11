"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReleaseCatalog, ReleaseInfo } from "@/lib/release";
import { useI18n } from "./i18n-provider";
import { DownloadIcon } from "./icons";

const formatDate = (value: string | null, locale: string) => value ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "—";
const formatSize = (value: number | null, locale: string) => value ? new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }).format(value / 1_000_000) : "—";
const formatMarketingVersion = (version: string) => version.split(".").slice(0, 2).join(".");

function DownloadButton({ release, label }: { release: ReleaseInfo; label: string }) {
  return release.downloadUrl ? <a className="button-primary download-primary" href={release.downloadUrl} aria-label={`${label} — ${release.filename}`}><DownloadIcon className="size-5" />{label}</a> : <span className="button-primary download-primary is-disabled" aria-disabled="true"><DownloadIcon className="size-5" />{label}</span>;
}

export function DownloadPageContent({ releases }: { releases: ReleaseCatalog }) {
  const release = releases.windows;
  const { locale, t } = useI18n();
  const d = t.downloadPage;
  const [copied, setCopied] = useState(false);
  const notes = release.notes.length ? release.notes : [...d.fallbackNotes];
  const facts = [[d.version, release.version], [d.released, formatDate(release.publishedAt, locale)], [d.filename, release.filename], [d.size, formatSize(release.size, locale)], [d.architectureLabel, release.architecture === "x86_64" ? d.architecture : release.architecture]];

  async function copyChecksum() {
    if (!release.sha256) return;
    try {
      await navigator.clipboard.writeText(release.sha256);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return <>
    <section className="download-hero hero-grid">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="download-hero-inner">
        <p className="section-label">{d.eyebrow}</p><span className="release-badge"><i />{release.channel === "beta" ? d.beta : d.stable}</span>
        <h1>{d.heroTitle}</h1><p className="download-lead">{d.heroBody}</p>
        <DownloadButton release={release} label={release.downloadUrl ? d.download : d.unavailable} />
        {!release.downloadUrl && <p className="availability-note">{d.unavailableHelp}</p>}
        {release.downloadUrl && release.sha256 && <ul className="download-trust" aria-label={d.security}>{d.trustItems.map((item) => <li key={item}><span aria-hidden>✓</span>{item}</li>)}</ul>}
        <div className="download-chips"><span>v{formatMarketingVersion(release.version)}</span><span>{d.windows}</span><span>{d.architecture}</span><span>{d.free}</span><span>{d.updates}</span></div>
      </div>
    </section>

    <section className="download-content section-shell" aria-labelledby="platform-heading"><div className="release-card">
      <div className="release-card-head"><div><p className="section-label">macOS</p><h2 id="platform-heading">{locale === "it" ? "Download per Mac" : "Downloads for Mac"}</h2></div><span className="release-source">macOS 15+</span></div>
      <p className="download-lead">{locale === "it" ? "Scegli la build nativa per il tuo Mac. Queste build non sono Universal2 e gli aggiornamenti sono manuali." : "Choose the native build for your Mac. These are not Universal2 builds and updates are manual."}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <DownloadButton release={releases.macos.arm64} label={releases.macos.arm64.downloadUrl ? "Apple Silicon · arm64" : (locale === "it" ? "Apple Silicon · presto disponibile" : "Apple Silicon · coming soon")} />
        <DownloadButton release={releases.macos.x86_64} label={releases.macos.x86_64.downloadUrl ? "Intel · x86_64" : (locale === "it" ? "Intel · presto disponibile" : "Intel · coming soon")} />
      </div>
      <p className="availability-note">{locale === "it" ? "Build attualmente non firmate né notarizzate da Apple: macOS potrebbe richiedere Control-click → Apri o Privacy e Sicurezza → Apri comunque." : "Currently not Apple Developer ID signed or notarized: macOS may require Control-click → Open or Privacy & Security → Open Anyway."}</p>
    </div></section>
    <section className="download-content section-shell" aria-labelledby="release-heading"><div className="release-card">
      <div className="release-card-head"><div><p className="section-label">{d.eyebrow}</p><h2 id="release-heading">{d.releaseTitle}</h2></div><span className="release-source">{release.source === "github" ? d.stable : d.unavailable}</span></div>
      <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {release.sha256 && <div className="checksum"><span>{d.checksum}</span><code>{release.sha256}</code><button type="button" onClick={copyChecksum} aria-label={d.copyChecksum}>{copied ? d.copied : d.copyChecksum}</button><span className="sr-only" role="status" aria-live="polite">{copied ? d.copied : ""}</span></div>}
      <a className="github-release-link" href={release.releaseUrl} target="_blank" rel="noopener noreferrer" aria-label={d.officialReleaseAria}>{d.officialRelease} <span aria-hidden>↗</span></a>
    </div></section>

    <section className="download-grid section-shell"><article><p className="section-label">01</p><h2>{d.whatsNew}</h2><ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul></article><article><p className="section-label">02</p><h2>{d.requirements}</h2><ul>{d.requirementItems.map((item) => <li key={item}>{item}</li>)}</ul></article></section>
    <section className="install-section section-shell"><div><p className="section-label">03</p><h2>{d.installation}</h2><ol>{d.installSteps.map((step) => <li key={step}>{step}</li>)}</ol></div><div><p className="section-label">04</p><h2>{d.security}</h2><ul>{d.securityItems.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
    <section className="preview-section section-shell"><div><p className="section-label">05 · {d.preview}</p><h2>{d.previewBody}</h2></div><Image src="/screenshots/sbc-solver.png" alt={d.previewAlt} width={1600} height={900} sizes="(max-width: 900px) 92vw, 60vw" loading="lazy" /></section>
    <section className="faq-section section-shell"><p className="section-label">06</p><h2>{d.faq}</h2><div>{d.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden>+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="final-download section-shell"><div><h2>{d.finalTitle}</h2><p>{d.finalBody}</p><DownloadButton release={release} label={release.downloadUrl ? d.download : d.unavailable} /></div></section>
  </>;
}

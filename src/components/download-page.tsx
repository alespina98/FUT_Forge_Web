"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReleaseCatalog, ReleaseInfo } from "@/lib/release";
import { BrowserBookmarkletSection } from "./browser-bookmarklet-section";
import { useI18n } from "./i18n-provider";
import { AndroidIcon, AppleIcon, BookmarkIcon, CheckIcon, DownloadIcon, GlobeIcon, RefreshIcon, ShieldIcon, WindowsIcon } from "./icons";
import { track } from "@/lib/analytics/client";

type DownloadPlatform = "windows" | "macos-arm64" | "macos-x86_64" | "android";

function trackDownload(platform: DownloadPlatform, version: string) {
  track(platform === "android" ? "android_download" : "desktop_download", { platform, version });
}

const formatDate = (value: string | null, locale: string) => value ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "—";
const formatSize = (value: number | null, locale: string) => value ? new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }).format(value / 1_000_000) : "—";
const formatMarketingVersion = (version: string) => version.split(".").slice(0, 2).join(".");
const securityIcons = [ShieldIcon, CheckIcon, RefreshIcon, CheckIcon];

function DownloadButton({ release, label, platform }: { release: ReleaseInfo; label: string; platform: DownloadPlatform }) {
  return release.downloadUrl ? <a className="button-primary download-primary" href={release.downloadUrl} aria-label={`${label} — ${release.filename}`} onClick={() => trackDownload(platform, release.version)}><DownloadIcon className="size-4.5" />{label}</a> : <span className="button-primary download-primary is-disabled" aria-disabled="true"><DownloadIcon className="size-4.5" />{label}</span>;
}

function PillAction({ release, label, platform }: { release: ReleaseInfo; label: string; platform: DownloadPlatform }) {
  return release.downloadUrl ? <a href={release.downloadUrl} aria-label={label} onClick={() => trackDownload(platform, release.version)}>{label}</a> : <span className="is-disabled" aria-disabled="true">{label}</span>;
}

export function DownloadPageContent({ releases }: { releases: ReleaseCatalog }) {
  const release = releases.windows;
  const { locale, t } = useI18n();
  const d = t.downloadPage;
  const [copied, setCopied] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const browserExpandRef = useRef<HTMLDivElement>(null);
  const facts = [[d.version, release.version], [d.released, formatDate(release.publishedAt, locale)], [d.filename, release.filename], [d.size, formatSize(release.size, locale)], [d.architectureLabel, release.architecture === "x86_64" ? d.architecture : release.architecture]];

  // BrowserBookmarkletSection mounts on demand (toggled open), well after
  // AmbientEffects' page-load IntersectionObserver already scanned the DOM
  // once for [data-reveal] elements - so its section-reveal opacity never
  // flips to visible on its own. It was opened by an explicit click, not
  // scroll, so just show it immediately rather than re-wiring a shared
  // observer for a one-off case.
  useEffect(() => {
    if (!showBrowser) return;
    browserExpandRef.current?.querySelectorAll("[data-reveal]").forEach((element) => element.classList.add("is-visible"));
  }, [showBrowser]);

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

  return (
    <div className="dl-page hero-grid relative">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />

      <section className="dl-hero">
        <div className="flex flex-col items-center gap-2.5">
          <p className="section-label">{d.eyebrow}</p>
          <span className="dl-badge"><i />{locale === "it" ? "Ultima" : "Latest"} {release.channel === "beta" ? d.beta : d.stable}</span>
        </div>
        <h1>{d.compactHeading}</h1>
        <p>{d.heroBody}</p>
      </section>

      <section aria-label={d.platformsLabel}>
        <div className="dl-cards">
          <article className="dl-card">
            <div className="dl-card-icon"><WindowsIcon className="size-6" /></div>
            <h3>{d.windowsLabel}{release.downloadUrl && <span className="dl-card-version">v{formatMarketingVersion(release.version)}</span>}</h3>
            <p>{d.windowsBody}</p>
            <DownloadButton release={releases.windows} label={releases.windows.downloadUrl ? d.windowsCta : d.unavailable} platform="windows" />
          </article>
          <article className="dl-card">
            <div className="dl-card-icon"><AndroidIcon className="size-6" /></div>
            <h3>{d.androidLabel}{releases.android.downloadUrl && <span className="dl-card-version">v{formatMarketingVersion(releases.android.version)}</span>}</h3>
            <p>{d.androidBody}</p>
            <DownloadButton release={releases.android} label={releases.android.downloadUrl ? d.androidCta : d.unavailable} platform="android" />
          </article>
          <article className="dl-card">
            <div className="dl-card-icon"><GlobeIcon className="size-6" /></div>
            <h3>{d.webAppLabel}</h3>
            <p>{d.webAppBody}</p>
            <Link href="/app" className="button-primary download-primary">{d.webAppCta}</Link>
          </article>
        </div>
        <p className="dl-autoupdate"><strong>{d.autoUpdateTitle}</strong> — {d.autoUpdateBody}</p>
      </section>

      <section className="dl-also-section" aria-label={d.alsoAvailableLabel}>
        <p className="dl-also-label">{d.alsoAvailableLabel}</p>
        <div className="dl-also-row">
          <div className="dl-pill">
            <div className="dl-pill-icon"><AppleIcon className="size-4" /></div>
            <div className="dl-pill-body"><strong>{d.macosPill}</strong><span>{d.macosPillBody}</span></div>
            <div className="dl-pill-actions">
              <PillAction release={releases.macos.arm64} label="Apple Silicon" platform="macos-arm64" />
              <PillAction release={releases.macos.x86_64} label="Intel" platform="macos-x86_64" />
            </div>
          </div>
          <button type="button" className="dl-pill" onClick={() => setShowBrowser((value) => !value)} aria-expanded={showBrowser}>
            <div className="dl-pill-icon"><BookmarkIcon className="size-4" /></div>
            <div className="dl-pill-body"><strong>{d.browserPill}</strong><span>{d.browserPillBody}</span></div>
            <div className="dl-pill-actions"><span>{showBrowser ? d.browserClose : d.browserCta}</span></div>
          </button>
        </div>
        {showBrowser && <div className="dl-browser-expand" ref={browserExpandRef}><BrowserBookmarkletSection /></div>}
      </section>

      <section className="dl-release-section" aria-labelledby="release-heading">
        <div className="dl-release-card">
          <div className="dl-release-head"><h2 id="release-heading">{d.releaseTitle}</h2><span className="release-source">{release.source === "github" ? d.stable : d.unavailable}</span></div>
          <dl className="dl-release-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {release.sha256 && <div className="dl-checksum"><span>{d.checksum}</span><code>{release.sha256}</code><button type="button" onClick={copyChecksum} aria-label={d.copyChecksum}>{copied ? d.copied : d.copyChecksum}</button><span className="sr-only" role="status" aria-live="polite">{copied ? d.copied : ""}</span></div>}
          <a className="dl-release-link" href={release.releaseUrl} target="_blank" rel="noopener noreferrer" aria-label={d.officialReleaseAria}>{d.officialRelease} <span aria-hidden>↗</span></a>
        </div>
      </section>

      <section className="dl-security-section" aria-label={d.security}>
        <div className="dl-security-grid">
          {d.securityCompact.map(([title, body], index) => {
            const Icon = securityIcons[index];
            return <div className="dl-security-item" key={title}><i><Icon className="size-4" /></i><strong>{title}</strong><p>{body}</p></div>;
          })}
        </div>
      </section>

      <section className="dl-help-section" aria-label={d.helpLabel}>
        <p className="section-label">{d.helpLabel}</p>
        <div className="dl-help-list">{d.helpFaqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden>+</span></summary><p>{answer}</p></details>)}</div>
        <Link href="/faq" className="dl-help-link">{d.viewAllFaqs} <span aria-hidden>→</span></Link>
      </section>

      <section className="dl-final">
        <h2>{d.finalCompactTitle}</h2>
        <div className="dl-final-actions">
          <DownloadButton release={release} label={release.downloadUrl ? d.download : d.unavailable} platform="windows" />
          <Link href="/app" className="button-secondary">{d.webAppCta}</Link>
        </div>
      </section>
    </div>
  );
}

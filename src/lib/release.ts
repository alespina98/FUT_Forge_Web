import { cache } from "react";
import { PRODUCT } from "./copy";

export const RELEASE_REPOSITORY = "alespina98/FUT_Forge_Releases";
export const RELEASE_REVALIDATE_SECONDS = 600;

export type ReleaseInfo = {
  version: string; channel: "stable" | "beta"; title: string; filename: string;
  publishedAt: string | null; downloadUrl: string | null; size: number | null;
  sha256: string | null; architecture: string; platform: string; minimumPlatform: string;
  notes: string[]; releaseUrl: string; source: "github" | "fallback";
};
export type ReleaseCatalog = { windows: ReleaseInfo; macos: { arm64: ReleaseInfo; x86_64: ReleaseInfo }; android: ReleaseInfo };

const releasePage = `https://github.com/${RELEASE_REPOSITORY}/releases`;
export const fallbackRelease: ReleaseInfo = {
  version: PRODUCT.version, channel: "stable", title: `FUT Forge ${PRODUCT.version}`,
  filename: "FUT_Forge_Setup.exe", publishedAt: null, downloadUrl: null, size: null,
  sha256: null, architecture: "x86_64", platform: "Windows",
  minimumPlatform: "Windows 10 or Windows 11", notes: [], releaseUrl: `${releasePage}/latest`, source: "fallback",
};
const fallbackMac = (architecture: "arm64" | "x86_64"): ReleaseInfo => ({
  version: "2.11.0", channel: "stable", title: "FUT Forge 2.11.0",
  filename: `FUT-Forge-2.11.0-macOS-${architecture}.dmg`, publishedAt: null, downloadUrl: null, size: null,
  sha256: null, architecture, platform: "macOS", minimumPlatform: "macOS 15 or later",
  notes: [], releaseUrl: releasePage, source: "fallback",
});
const fallbackAndroid: ReleaseInfo = {
  version: "1.0.18", channel: "stable", title: "FUT Forge 1.0.18",
  filename: "FUT-Forge-Android-1.0.18.apk", publishedAt: null, downloadUrl: null, size: null,
  sha256: null, architecture: "universal", platform: "Android", minimumPlatform: "Android 8.0 (API 26) or later",
  notes: [], releaseUrl: releasePage, source: "fallback",
};

 type Asset = { name?: unknown; browser_download_url?: unknown; size?: unknown; digest?: unknown };
 type GitHubRelease = { tag_name?: unknown; name?: unknown; body?: unknown; published_at?: unknown; html_url?: unknown; prerelease?: unknown; draft?: unknown; assets?: unknown };
 type Manifest = { release?: { version?: unknown; channel?: unknown; publishedAt?: unknown }; compatibility?: { architecture?: unknown } };
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const validDate = (value: unknown) => { const candidate = text(value); return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null; };
const validUrl = (value: unknown, host: string) => { try { const url = new URL(String(value)); return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null; } catch { return null; } };
const validVersion = (value: unknown) => { const candidate = text(value)?.replace(/^v/i, ""); return candidate && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(candidate) ? candidate : null; };
const digest = (value: unknown) => { const candidate = text(value)?.replace(/^sha256:/i, "").toLowerCase(); return candidate && /^[a-f0-9]{64}$/.test(candidate) ? candidate : null; };
const releaseNotes = (value: unknown) => text(value)?.split(/\r?\n/).map((line) => line.replace(/^\s*(?:#{1,6}\s*|[-*+]\s+|\d+[.)]\s+)/, "").replace(/[*_`~]/g, "").trim()).filter((line) => line && line.length <= 180).slice(0, 8) ?? [];
async function fetchJson(url: string): Promise<unknown> { const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "FUT-Forge-Website" }, next: { revalidate: RELEASE_REVALIDATE_SECONDS } }); if (!response.ok) throw new Error(`Release request failed: ${response.status}`); return response.json(); }
const assetsOf = (release: GitHubRelease) => Array.isArray(release.assets) ? release.assets as Asset[] : [];
const publicReleases = (raw: unknown) => Array.isArray(raw) ? (raw as GitHubRelease[]).filter((release) => !release.draft && !release.prerelease) : [];

async function windowsRelease(releases: GitHubRelease[]): Promise<ReleaseInfo> {
  for (const release of releases) {
    const assets = assetsOf(release); const installer = assets.find((asset) => text(asset.name)?.toLowerCase().endsWith(".exe")); if (!installer) continue;
    const downloadUrl = validUrl(installer.browser_download_url, "github.com"); const releaseUrl = validUrl(release.html_url, "github.com"); if (!downloadUrl || !releaseUrl) continue;
    let manifest: Manifest = {}; const manifestAsset = assets.find((asset) => text(asset.name)?.toLowerCase() === "version.json"); const manifestUrl = manifestAsset && validUrl(manifestAsset.browser_download_url, "github.com"); if (manifestUrl) { try { manifest = await fetchJson(manifestUrl) as Manifest; } catch {} }
    const version = validVersion(manifest.release?.version) ?? validVersion(release.tag_name); if (!version) continue;
    return { version, channel: "stable", title: text(release.name) ?? `FUT Forge ${version}`, filename: text(installer.name) ?? "FUT_Forge_Setup.exe", publishedAt: validDate(manifest.release?.publishedAt) ?? validDate(release.published_at), downloadUrl, size: typeof installer.size === "number" ? installer.size : null, sha256: digest(installer.digest), architecture: text(manifest.compatibility?.architecture) ?? "x86_64", platform: "Windows", minimumPlatform: "Windows 10 or Windows 11", notes: releaseNotes(release.body), releaseUrl, source: "github" };
  }
  return fallbackRelease;
}
function macRelease(releases: GitHubRelease[], architecture: "arm64" | "x86_64"): ReleaseInfo {
  const pattern = new RegExp(`^FUT-Forge-(\\d+\\.\\d+\\.\\d+)-macOS-${architecture}\\.dmg$`, "i");
  for (const release of releases) for (const asset of assetsOf(release)) {
    const filename = text(asset.name); const match = filename?.match(pattern); if (!filename || !match) continue;
    const downloadUrl = validUrl(asset.browser_download_url, "github.com"); const releaseUrl = validUrl(release.html_url, "github.com"); if (!downloadUrl || !releaseUrl) continue;
    return { version: match[1], channel: "stable", title: text(release.name) ?? `FUT Forge ${match[1]}`, filename, publishedAt: validDate(release.published_at), downloadUrl, size: typeof asset.size === "number" ? asset.size : null, sha256: digest(asset.digest), architecture, platform: "macOS", minimumPlatform: "macOS 15 or later", notes: releaseNotes(release.body), releaseUrl, source: "github" };
  }
  return fallbackMac(architecture);
}
function androidRelease(releases: GitHubRelease[]): ReleaseInfo {
  const pattern = /^FUT-Forge-Android-(\d+\.\d+\.\d+)\.apk$/i;
  for (const release of releases) for (const asset of assetsOf(release)) {
    const filename = text(asset.name); const match = filename?.match(pattern); if (!filename || !match) continue;
    const downloadUrl = validUrl(asset.browser_download_url, "github.com"); const releaseUrl = validUrl(release.html_url, "github.com"); if (!downloadUrl || !releaseUrl) continue;
    return { version: match[1], channel: "stable", title: text(release.name) ?? `FUT Forge ${match[1]}`, filename, publishedAt: validDate(release.published_at), downloadUrl, size: typeof asset.size === "number" ? asset.size : null, sha256: digest(asset.digest), architecture: "universal", platform: "Android", minimumPlatform: "Android 8.0 (API 26) or later", notes: releaseNotes(release.body), releaseUrl, source: "github" };
  }
  return fallbackAndroid;
}
async function loadReleaseCatalog(): Promise<ReleaseCatalog> { try { const releases = publicReleases(await fetchJson(`https://api.github.com/repos/${RELEASE_REPOSITORY}/releases?per_page=20`)); return { windows: await windowsRelease(releases), macos: { arm64: macRelease(releases, "arm64"), x86_64: macRelease(releases, "x86_64") }, android: androidRelease(releases) }; } catch { return { windows: fallbackRelease, macos: { arm64: fallbackMac("arm64"), x86_64: fallbackMac("x86_64") }, android: fallbackAndroid }; } }
export const getReleaseCatalog = cache(loadReleaseCatalog);
export const getLatestRelease = cache(async () => (await loadReleaseCatalog()).windows);
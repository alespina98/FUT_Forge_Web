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

export const fallbackRelease: ReleaseInfo = {
  version: PRODUCT.version, channel: "stable", title: `FUT Forge ${PRODUCT.version}`,
  filename: "FUT_Forge_Setup.exe", publishedAt: null, downloadUrl: null, size: null,
  sha256: null, architecture: "x86_64", platform: "Windows",
  minimumPlatform: "Windows 10 or Windows 11", notes: [],
  releaseUrl: `https://github.com/${RELEASE_REPOSITORY}/releases/latest`, source: "fallback",
};

type Asset = { name?: unknown; browser_download_url?: unknown; size?: unknown; digest?: unknown };
type GitHubRelease = { tag_name?: unknown; name?: unknown; body?: unknown; published_at?: unknown; html_url?: unknown; prerelease?: unknown; assets?: unknown };
type Manifest = { release?: { version?: unknown; channel?: unknown; publishedAt?: unknown }; compatibility?: { platform?: unknown; architecture?: unknown } };
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const validDate = (value: unknown) => { const candidate = text(value); return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null; };
const validUrl = (value: unknown, host: string) => { try { const url = new URL(String(value)); return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null; } catch { return null; } };
const validVersion = (value: unknown) => { const candidate = text(value)?.replace(/^v/i, ""); return candidate && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(candidate) ? candidate : null; };
const digest = (value: unknown) => { const candidate = text(value)?.replace(/^sha256:/i, "").toLowerCase(); return candidate && /^[a-f0-9]{64}$/.test(candidate) ? candidate : null; };
const releaseNotes = (value: unknown) => text(value)?.split(/\r?\n/).map((line) => line.replace(/^\s*(?:#{1,6}|[-*+]\s*)/, "").trim()).filter((line) => line && !/^(?:fut forge \d|improvements?|more exciting updates)/i.test(line)).slice(0, 8) ?? [];

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "FUT-Forge-Website" }, next: { revalidate: RELEASE_REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(`Release request failed: ${response.status}`);
  return response.json();
}

async function loadLatestRelease(): Promise<ReleaseInfo> {
  try {
    const raw = await fetchJson(`https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`) as GitHubRelease;
    const assets = Array.isArray(raw.assets) ? raw.assets as Asset[] : [];
    const installer = assets.find((asset) => text(asset.name)?.toLowerCase().endsWith(".exe"));
    if (!installer) throw new Error("No Windows installer in latest release");
    const installerUrl = validUrl(installer.browser_download_url, "github.com");
    const releaseUrl = validUrl(raw.html_url, "github.com");
    if (!installerUrl || !releaseUrl) throw new Error("Invalid release URLs");
    const manifestAsset = assets.find((asset) => text(asset.name)?.toLowerCase() === "version.json");
    let manifest: Manifest = {};
    const manifestUrl = manifestAsset && validUrl(manifestAsset.browser_download_url, "github.com");
    if (manifestUrl) { try { manifest = await fetchJson(manifestUrl) as Manifest; } catch { /* Release metadata is sufficient. */ } }
    const version = validVersion(manifest.release?.version) ?? validVersion(raw.tag_name);
    if (!version) throw new Error("Invalid release version");
    const channelValue = text(manifest.release?.channel)?.toLowerCase();
    return {
      version, channel: channelValue === "beta" || raw.prerelease === true ? "beta" : "stable",
      title: text(raw.name) ?? `FUT Forge ${version}`, filename: text(installer.name) ?? "FUT_Forge_Setup.exe",
      publishedAt: validDate(manifest.release?.publishedAt) ?? validDate(raw.published_at), downloadUrl: installerUrl,
      size: typeof installer.size === "number" && Number.isSafeInteger(installer.size) && installer.size > 0 ? installer.size : null,
      sha256: digest(installer.digest), architecture: text(manifest.compatibility?.architecture) ?? "x86_64",
      platform: "Windows", minimumPlatform: "Windows 10 or Windows 11", notes: releaseNotes(raw.body), releaseUrl, source: "github",
    };
  } catch { return fallbackRelease; }
}

export const getLatestRelease = cache(loadLatestRelease);

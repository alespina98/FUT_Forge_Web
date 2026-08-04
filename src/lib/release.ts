import { PRODUCT } from "./copy";

export type ReleaseInfo = {
  version: string;
  filename: string;
  publishedAt: string | null;
  downloadUrl: string | null;
  source: "github" | "fallback";
};

export interface ReleaseProvider {
  getLatest(): Promise<ReleaseInfo>;
}

const fallbackRelease: ReleaseInfo = {
  version: PRODUCT.version,
  filename: `FUT-Forge-Setup-${PRODUCT.version}.exe`,
  publishedAt: null,
  downloadUrl: null,
  source: "fallback",
};

class GitHubReleaseProvider implements ReleaseProvider {
  constructor(private readonly repository: string) {}

  async getLatest(): Promise<ReleaseInfo> {
    const response = await fetch(`https://api.github.com/repos/${this.repository}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`GitHub release request failed: ${response.status}`);

    const release = await response.json() as {
      tag_name: string;
      published_at: string | null;
      assets: Array<{ name: string; browser_download_url: string }>;
    };
    const asset = release.assets.find((item) => item.name.toLowerCase().endsWith(".exe"));
    if (!asset) throw new Error("GitHub release has no Windows installer");

    return {
      version: release.tag_name.replace(/^v/, ""),
      filename: asset.name,
      publishedAt: release.published_at,
      downloadUrl: asset.browser_download_url,
      source: "github",
    };
  }
}

export async function getLatestRelease(): Promise<ReleaseInfo> {
  const repository = process.env.FUT_FORGE_GITHUB_REPOSITORY;
  if (!repository) return fallbackRelease;
  try {
    return await new GitHubReleaseProvider(repository).getLatest();
  } catch {
    return fallbackRelease;
  }
}

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Supabase rollback branches remain intentionally unreachable while static recovery is primary.
import "server-only";
import { getManifest, isFc27ArtifactError, readArtifact } from "./static-data";
import { boundedFc27SupabaseFetch } from "./supabase-fallback";

const DEFAULT_SUPABASE_URL = "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const PLAYER_SITEMAP_CHUNK_SIZE = 5_000;
export const PLAYER_SITEMAP_REVALIDATE_SECONDS = 86_400;

const POSTGREST_PAGE_SIZE = 1_000;
const sitemapFetchOptions = {
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  next: { revalidate: PLAYER_SITEMAP_REVALIDATE_SECONDS },
} as const;

export type PlayerSitemapRow = {
  ea_player_id: number;
  slug: string;
};

export async function fetchPlayerSitemapCount(): Promise<number> {
  try{return (await getManifest()).playerCount}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: sitemap-count (${error.artifact})`)}
  const params = new URLSearchParams({ select: "ea_player_id", limit: "1" });
  const response = await boundedFc27SupabaseFetch("sitemap-count",`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
    ...sitemapFetchOptions,
    method: "HEAD",
    headers: { ...sitemapFetchOptions.headers, Prefer: "count=exact" },
  });
  if (!response.ok) throw new Error(`Unable to count FC27 players (${response.status})`);

  const contentRange = response.headers.get("content-range");
  const total = contentRange?.includes("/") ? Number(contentRange.split("/")[1]) : Number.NaN;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("FC27 player count response did not contain a valid exact count");
  }
  return total;
}

export async function fetchPlayerSitemapChunk(chunkIndex: number): Promise<PlayerSitemapRow[]> {
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0) return [];
  try{const rel=(await getManifest()).artifacts.sitemaps[chunkIndex];return rel?await readArtifact<PlayerSitemapRow[]>(rel):[]}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: sitemap-chunk (${error.artifact})`)}

  const chunkOffset = chunkIndex * PLAYER_SITEMAP_CHUNK_SIZE;
  const rows: PlayerSitemapRow[] = [];

  while (rows.length < PLAYER_SITEMAP_CHUNK_SIZE) {
    const limit = Math.min(POSTGREST_PAGE_SIZE, PLAYER_SITEMAP_CHUNK_SIZE - rows.length);
    const params = new URLSearchParams({
      select: "ea_player_id,slug",
      order: "ea_player_id.asc",
      offset: String(chunkOffset + rows.length),
      limit: String(limit),
    });
    const response = await boundedFc27SupabaseFetch("sitemap-chunk",`${supabaseUrl}/rest/v1/fc27_players?${params}`,sitemapFetchOptions);
    if (!response.ok) throw new Error(`Unable to load FC27 player sitemap chunk (${response.status})`);

    const page = (await response.json()) as PlayerSitemapRow[];
    for (const row of page) {
      if (!Number.isSafeInteger(row.ea_player_id) || row.ea_player_id <= 0 || !row.slug?.trim()) {
        throw new Error("FC27 player sitemap data contains an invalid ID or slug");
      }
    }
    rows.push(...page);
    if (page.length < limit) break;
  }

  return rows;
}

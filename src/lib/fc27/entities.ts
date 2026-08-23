import "server-only";
import { unstable_cache } from "next/cache";
import type { RankingPlayer } from "./rankings-shared";
import { entitySlug } from "./entity-slug";

const DEFAULT_URL = "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_KEY = "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

export const ENTITY_KINDS = ["nations", "clubs", "leagues"] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];
export type Fc27Entity = { name: string; slug: string; count: number };

const config: Record<EntityKind, { field: string; threshold: number }> = {
  nations: { field: "nationality_name", threshold: 5 },
  clubs: { field: "club_name", threshold: 5 },
  leagues: { field: "league_name", threshold: 10 },
};

const fetchEntityRows = unstable_cache(async () => {
  const countResponse = await fetch(`${url}/rest/v1/fc27_players?select=ea_player_id&limit=1`, {
    headers: { ...headers, Prefer: "count=exact" },
  });
  if (!countResponse.ok) throw new Error(`Unable to count FC27 entities (${countResponse.status})`);
  const total = Number(countResponse.headers.get("content-range")?.split("/")[1]);
  if (!Number.isSafeInteger(total)) throw new Error("Unable to determine FC27 entity count");
  const pages = await Promise.all(Array.from({ length: Math.ceil(total / 1000) }, async (_, index) => {
    const params = new URLSearchParams({ select: "nationality_name,club_name,league_name", order: "ea_player_id.asc", offset: String(index * 1000), limit: "1000" });
    const response = await fetch(`${url}/rest/v1/fc27_players?${params}`, { headers });
    if (!response.ok) throw new Error(`Unable to load FC27 entity directory (${response.status})`);
    return response.json() as Promise<Array<{ nationality_name: string; club_name: string | null; league_name: string | null }>>;
  }));
  return pages.flat();
}, ["fc27-entity-directory-v1"], { revalidate: 3600 });

export async function fetchEntityDirectory(kind: EntityKind, includeBelowThreshold = false): Promise<Fc27Entity[]> {
  const { field, threshold } = config[kind];
  const counts = new Map<string, number>();
  for (const row of await fetchEntityRows()) {
    const name = row[field as keyof typeof row];
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count, slug: entitySlug(name) }))
    .filter((entity) => includeBelowThreshold || entity.count >= threshold)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function resolveEntity(kind: EntityKind, slug: string): Promise<Fc27Entity | null> {
  return (await fetchEntityDirectory(kind)).find((entity) => entity.slug === slug) ?? null;
}

export async function fetchEntityPlayers(kind: EntityKind, entity: Fc27Entity): Promise<{ players: RankingPlayer[]; total: number }> {
  const params = new URLSearchParams({
    select: "ea_player_id,slug,display_name,overall,position_short_label,nationality_name,nationality_image_url,club_name,club_image_url,league_name,avatar_url,pace,shooting,passing,dribbling,defending,physicality",
    order: "overall.desc,display_name.asc,ea_player_id.asc",
    limit: "50",
  });
  params.set(config[kind].field, `eq.${entity.name}`);
  const response = await fetch(`${url}/rest/v1/fc27_players?${params}`, {
    headers: { ...headers, Prefer: "count=exact" }, next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Unable to load FC27 ${kind} page (${response.status})`);
  const total = Number(response.headers.get("content-range")?.split("/")[1]);
  return { players: await response.json() as RankingPlayer[], total };
}

export async function entityHref(kind: EntityKind, name: string | null): Promise<string | null> {
  if (!name) return null;
  const entity = (await fetchEntityDirectory(kind)).find((item) => item.name === name);
  return entity ? `/fc27/${kind}/${entity.slug}` : null;
}

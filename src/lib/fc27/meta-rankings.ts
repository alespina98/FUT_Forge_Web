import "server-only";

import { calculateMetaRating, type Fc27MetaPlayer } from "./meta-rating";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const COLUMNS = "ea_player_id,slug,display_name,overall,position_short_label,club_name,club_image_url,nationality_name,nationality_image_url,league_name,avatar_url,pace,shooting,passing,dribbling,defending,physicality,skill_moves_raw,weak_foot,player_abilities_raw";

export const META_POSITION_FILTERS = ["ST", "LW", "RW", "CAM", "CM", "CDM", "LB", "RB", "CB", "GK"] as const;
export type MetaPositionFilter = (typeof META_POSITION_FILTERS)[number];

type SourcePlayer = Fc27MetaPlayer & {
  slug: string;
  club_name: string | null;
  club_image_url: string | null;
  nationality_name: string;
  nationality_image_url: string | null;
  league_name: string | null;
  avatar_url: string | null;
};

export type MetaRankingPlayer = SourcePlayer & { base_meta_rating: number };

export async function fetchMetaRankings(position?: MetaPositionFilter): Promise<MetaRankingPlayer[]> {
  const players: SourcePlayer[] = [];
  for (let offset = 0; ; offset += 1000) {
    const params = new URLSearchParams({ select: COLUMNS, order: "ea_player_id.asc", offset: String(offset), limit: "1000" });
    if (position) params.set("position_short_label", `eq.${position}`);
    const response = await fetch(`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Unable to load Base Meta rankings (${response.status})`);
    const rows = (await response.json()) as SourcePlayer[];
    players.push(...rows);
    if (rows.length < 1000) break;
  }

  return players.flatMap((player) => {
    const rating = calculateMetaRating(player);
    return rating ? [{ ...player, base_meta_rating: rating.meta }] : [];
  }).sort((a, b) =>
    b.base_meta_rating - a.base_meta_rating ||
    b.overall - a.overall ||
    a.display_name.localeCompare(b.display_name, "en") ||
    a.ea_player_id - b.ea_player_id
  ).slice(0, 100);
}

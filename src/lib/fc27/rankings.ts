import "server-only";
import type { RankingPlayer, RankingStat } from "./rankings-shared";

const DEFAULT_SUPABASE_URL = "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const DB_FIELD: Record<RankingStat, "overall" | "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physicality"> = {
  overall: "overall", pace: "pace", shooting: "shooting", passing: "passing", dribbling: "dribbling", defending: "defending", physical: "physicality",
};

export type RankingQuery = { stat: RankingStat; position?: string; nation?: string; club?: string; league?: string };
const COLUMNS = "ea_player_id,slug,display_name,overall,position_short_label,nationality_name,nationality_image_url,club_name,club_image_url,league_name,avatar_url,pace,shooting,passing,dribbling,defending,physicality";

export async function fetchRankings(query: RankingQuery): Promise<RankingPlayer[]> {
  if (query.stat !== "overall" && query.position === "GK") return [];
  const field = DB_FIELD[query.stat];
  const order = query.stat === "overall" ? "overall.desc,display_name.asc,ea_player_id.asc" : `${field}.desc.nullslast,overall.desc,display_name.asc,ea_player_id.asc`;
  const params = new URLSearchParams({ select: COLUMNS, order, limit: "50" });
  if (query.stat !== "overall") {
    params.set("position_short_label", "neq.GK");
    params.set(field, "not.is.null");
  }
  if (query.position) params.set("position_short_label", `eq.${query.position}`);
  if (query.nation) params.set("nationality_name", `eq.${query.nation}`);
  if (query.league) params.set("league_name", `eq.${query.league}`);
  if (query.club?.trim()) params.set("club_name", `ilike.*${query.club.trim()}*`);

  const response = await fetch(`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Unable to load FC27 rankings (${response.status})`);
  return (await response.json()) as RankingPlayer[];
}

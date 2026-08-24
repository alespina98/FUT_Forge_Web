/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Supabase rollback branches remain intentionally unreachable while static recovery is primary.
import "server-only";
import type { RankingPlayer, RankingStat } from "./rankings-shared";
import { getAllPlayersStatic, isFc27ArtifactError, toRanking } from "./static-data";
import { boundedFc27SupabaseFetch } from "./supabase-fallback";

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
  try{const staticField=DB_FIELD[query.stat],club=query.club?.trim().toLowerCase();return (await getAllPlayersStatic()).filter(p=>(query.stat==="overall"||p.position_short_label!=="GK")&&(!query.position||p.position_short_label===query.position)&&(!query.nation||p.nationality_name===query.nation)&&(!query.league||p.league_name===query.league)&&(!club||(p.club_name??"").toLowerCase().includes(club))&&(query.stat==="overall"||p[staticField]!==null)).sort((a,b)=>query.stat==="overall"?b.overall-a.overall||a.display_name.localeCompare(b.display_name)||a.ea_player_id-b.ea_player_id:(b[staticField]??-1)-(a[staticField]??-1)||b.overall-a.overall||a.display_name.localeCompare(b.display_name)||a.ea_player_id-b.ea_player_id).slice(0,50).map(toRanking)}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: rankings (${error.artifact})`)}
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

  const response = await boundedFc27SupabaseFetch("rankings",`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Unable to load FC27 rankings (${response.status})`);
  return (await response.json()) as RankingPlayer[];
}

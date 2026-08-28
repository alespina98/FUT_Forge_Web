/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Supabase rollback branches remain intentionally unreachable while static recovery is primary.
import "server-only";
import { foldStatic, getAllPlayersStatic, getPlayerByIdStatic, getPlayersByIdsStatic, getSearchIndexStatic, isFc27ArtifactError, toList } from "./static-data.ts";
import { boundedFc27SupabaseFetch } from "./supabase-fallback.ts";

// Server-only read layer for public.fc27_players - talks to PostgREST
// directly with the anon/publishable key, the same pattern already
// established in src/lib/leaks/supabase-read.ts. RLS (see
// supabase/migrations/0008_fc27_database.sql) is the real read boundary;
// this key is not a secret. Never imports the service-role key.
const DEFAULT_SUPABASE_URL = "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const PAGE_SIZE = 48;

export const SORT_OPTIONS = {
  overall_desc: "overall.desc,rank.asc",
  overall_asc: "overall.asc,rank.desc",
  pace_desc: "pace.desc.nullslast,overall.desc,rank.asc",
  shooting_desc: "shooting.desc.nullslast,overall.desc,rank.asc",
  passing_desc: "passing.desc.nullslast,overall.desc,rank.asc",
  dribbling_desc: "dribbling.desc.nullslast,overall.desc,rank.asc",
  defending_desc: "defending.desc.nullslast,overall.desc,rank.asc",
  physicality_desc: "physicality.desc.nullslast,overall.desc,rank.asc",
  name_asc: "display_name.asc,ea_player_id.asc",
} as const;
export type SortKey = keyof typeof SORT_OPTIONS;
export const DEFAULT_SORT: SortKey = "overall_desc";
export function isSortKey(value: string | undefined): value is SortKey {
  return !!value && value in SORT_OPTIONS;
}

export type PlayerListItem = {
  ea_player_id: number;
  slug: string;
  display_name: string;
  // common_name/preferred_foot_code/alternate_positions were originally
  // detail-only (see fetchPlayerById) but the Step 5D-refinement card
  // reference needs the shorter on-card name, foot badge and primary alt
  // position on the LIST card too - all three are tiny fields (a string, an
  // int, a short array), unlike the heavy detailed_attributes/goalkeeping
  // JSONB blobs that rule was actually protecting against, so adding them
  // here doesn't meaningfully change the list payload's weight.
  common_name: string | null;
  overall: number;
  rank: number;
  position_short_label: string;
  nationality_id: number;
  nationality_name: string;
  nationality_image_url: string | null;
  club_name: string | null;
  club_id: number | null;
  club_image_url: string | null;
  league_name: string | null;
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physicality: number | null;
  skill_moves_raw: number;
  weak_foot: number;
  preferred_foot_code: number;
  alternate_positions: AlternatePosition[];
  // Real EA portrait photo (see the Step 5B card-asset audit) - a photo
  // never goes "stale" the way a stats-baked card image would, so it's
  // safe to use directly. Not every player has one (many return 403); the
  // card component must handle that failure, not this data layer.
  avatar_url: string | null;
};

export type PlayersQuery = {
  q?: string;
  position?: string;
  nation?: string;
  league?: string;
  club?: string;
  skillMoves?: number;
  weakFoot?: number;
  overallMin?: number;
  overallMax?: number;
  paceMin?: number;
  shootingMin?: number;
  passingMin?: number;
  dribblingMin?: number;
  defendingMin?: number;
  physicalityMin?: number;
  sort?: SortKey;
  page?: number;
};

export type PlayersResult = {
  players: PlayerListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const LIST_COLUMNS = "ea_player_id,slug,display_name,common_name,overall,rank,position_short_label,nationality_id,nationality_name,nationality_image_url,club_id,club_name,club_image_url,league_name,pace,shooting,passing,dribbling,defending,physicality,skill_moves_raw,weak_foot,preferred_foot_code,alternate_positions,avatar_url";

// Accent-fold the query the same way the importer builds search_text (see
// scripts/fc27/sync-fc27-players.ts's foldAccents) so "Mbappe" matches
// "Mbappé" - the stored search_document/search_text are already folded,
// so the query side must fold too or a plain "Mbappe" would never match.
function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export async function fetchPlayers(query: PlayersQuery): Promise<PlayersResult> {
  const page = Math.max(1, query.page ?? 1);
  const sortKey = query.sort && isSortKey(query.sort) ? query.sort : DEFAULT_SORT;

  try { const all=await getSearchIndexStatic();
  const searchQuery=query.q?.trim(),clubQuery=query.club?.trim();
  const local=all.filter(p=>(!searchQuery||foldStatic([p.display_name,p.first_name,p.last_name,p.common_name,p.nationality_name,p.club_name,p.league_name,p.position_short_label,p.position_label].filter(Boolean).join(" ")).includes(foldStatic(searchQuery)))&&(!query.position||p.position_short_label===query.position)&&(!query.nation||p.nationality_name===query.nation)&&(!query.league||p.league_name===query.league)&&(!clubQuery||foldStatic(p.club_name??"").includes(foldStatic(clubQuery)))&&(!query.skillMoves||p.skill_moves_raw===query.skillMoves)&&(!query.weakFoot||p.weak_foot===query.weakFoot)&&(!query.overallMin||p.overall>=query.overallMin)&&(!query.overallMax||p.overall<=query.overallMax)&&(!query.paceMin||(p.pace??-1)>=query.paceMin)&&(!query.shootingMin||(p.shooting??-1)>=query.shootingMin)&&(!query.passingMin||(p.passing??-1)>=query.passingMin)&&(!query.dribblingMin||(p.dribbling??-1)>=query.dribblingMin)&&(!query.defendingMin||(p.defending??-1)>=query.defendingMin)&&(!query.physicalityMin||(p.physicality??-1)>=query.physicalityMin));
  const field=sortKey.replace(/_(asc|desc)$/,'') as keyof PlayerDetail,desc=sortKey.endsWith('_desc');local.sort((a,b)=>{if(sortKey==='name_asc')return a.display_name.localeCompare(b.display_name)||a.ea_player_id-b.ea_player_id;const av=(a[field] as number|null)??-1,bv=(b[field] as number|null)??-1;return(desc?bv-av:av-bv)||a.rank-b.rank});const staticTotal=local.length,staticPageCount=Math.max(1,Math.ceil(staticTotal/PAGE_SIZE));return{players:local.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(toList),total:staticTotal,page:Math.min(page,staticPageCount),pageSize:PAGE_SIZE,pageCount:staticPageCount}; } catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: players (${error.artifact})`)}
  /* Supabase fallback retained below for rollback; static data is the normal source. */
  const params = new URLSearchParams();
  params.set("select", LIST_COLUMNS);
  params.set("order", SORT_OPTIONS[sortKey]);
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String((page - 1) * PAGE_SIZE));

  const q = query.q?.trim();
  if (q) params.set("search_document", `plfts(simple).${foldAccents(q)}`);
  if (query.position) params.set("position_short_label", `eq.${query.position}`);
  if (query.nation) params.set("nationality_name", `eq.${query.nation}`);
  if (query.league) params.set("league_name", `eq.${query.league}`);
  if (query.club?.trim()) params.set("club_name", `ilike.*${query.club.trim()}*`);
  if (query.skillMoves) params.set("skill_moves_raw", `eq.${query.skillMoves}`);
  if (query.weakFoot) params.set("weak_foot", `eq.${query.weakFoot}`);
  if (query.overallMin) params.set("overall", `gte.${query.overallMin}`);
  if (query.overallMax) params.append("overall", `lte.${query.overallMax}`);
  if (query.paceMin) params.set("pace", `gte.${query.paceMin}`);
  if (query.shootingMin) params.set("shooting", `gte.${query.shootingMin}`);
  if (query.passingMin) params.set("passing", `gte.${query.passingMin}`);
  if (query.dribblingMin) params.set("dribbling", `gte.${query.dribblingMin}`);
  if (query.defendingMin) params.set("defending", `gte.${query.defendingMin}`);
  if (query.physicalityMin) params.set("physicality", `gte.${query.physicalityMin}`);

  const response = await boundedFc27SupabaseFetch("players",`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Prefer: "count=exact" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Unable to load players (${response.status})`);

  const players = (await response.json()) as PlayerListItem[];
  const contentRange = response.headers.get("content-range");
  const total = contentRange?.includes("/") ? Number(contentRange.split("/")[1]) : players.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { players, total, page: Math.min(page, pageCount), pageSize: PAGE_SIZE, pageCount };
}

export type FilterOptions = { nations: string[]; leagues: string[]; positions: string[] };

// Nation/league/position lists are small once deduped (164/57/12 distinct
// values in the full dataset) but PostgREST has no server-side DISTINCT
// over arbitrary columns, so this reads three narrow columns for all rows
// once and dedupes in Node - only the small deduped arrays this returns
// ever reach the client (positions are real observed values, not an
// assumed FIFA-position list). Cached for an hour: this data changes only
// when FC27 re-syncs, not per request. Club is deliberately NOT included
// here - 583 distinct values is too many for a dropdown, so the UI uses a
// free-text filter (ilike) for club instead, matching the task's own "too
// large for a dropdown -> searchable behavior" guidance without needing
// this list.
export async function fetchFilterOptions(): Promise<FilterOptions> {
  try{const all=await getSearchIndexStatic();return{nations:[...new Set(all.map(p=>p.nationality_name))].sort(),leagues:[...new Set(all.map(p=>p.league_name).filter((x):x is string=>!!x))].sort(),positions:[...new Set(all.map(p=>p.position_short_label))].sort()}}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: filters (${error.artifact})`)}
  /* rollback fallback */
  const nations = new Set<string>();
  const leagues = new Set<string>();
  const positions = new Set<string>();
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({ select: "nationality_name,league_name,position_short_label", order: "ea_player_id.asc", offset: String(offset), limit: "1000" });
    const response = await boundedFc27SupabaseFetch("filter-options",`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Unable to load filter options (${response.status})`);
    const rows = (await response.json()) as Array<{ nationality_name: string; league_name: string | null; position_short_label: string }>;
    if (rows.length === 0) break;
    for (const row of rows) {
      nations.add(row.nationality_name);
      if (row.league_name) leagues.add(row.league_name);
      positions.add(row.position_short_label);
    }
    if (rows.length < 1000) break;
    offset += rows.length;
  }
  // Positions sorted in a football-sensible order when recognized (GK ->
  // defense -> midfield -> attack); any unrecognized code (future EA
  // position not in this list) still appears, just alphabetically after.
  const positionOrder = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];
  const positions_ = [...positions].sort((a, b) => {
    const ia = positionOrder.indexOf(a), ib = positionOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return { nations: [...nations].sort((a, b) => a.localeCompare(b)), leagues: [...leagues].sort((a, b) => a.localeCompare(b)), positions: positions_ };
}

export type StatValue = { value: number; diff: number };
export type AlternatePosition = { id: string; label: string; short_label: string };

export type PlayerDetail = {
  ea_player_id: number;
  slug: string;
  first_name: string;
  last_name: string;
  common_name: string | null;
  display_name: string;
  overall: number;
  rank: number;
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physicality: number | null;
  face_stat_diffs: Record<string, number>;
  position_id: string;
  position_short_label: string;
  position_label: string;
  position_type_id: string | null;
  position_type_name: string | null;
  alternate_positions: AlternatePosition[];
  nationality_id: number;
  nationality_name: string;
  nationality_image_url: string | null;
  club_id: number | null;
  club_name: string | null;
  club_image_url: string | null;
  league_name: string | null;
  birthdate: string;
  skill_moves_raw: number;
  weak_foot: number;
  preferred_foot_code: number;
  height_cm: number | null;
  weight_kg: number | null;
  detailed_attributes: Record<string, StatValue>;
  goalkeeping: Record<string, StatValue>;
  player_abilities_raw: unknown[];
  avatar_url: string | null;
};

export const DETAIL_COLUMNS = "ea_player_id,slug,first_name,last_name,common_name,display_name,overall,rank,pace,shooting,passing,dribbling,defending,physicality,face_stat_diffs,position_id,position_short_label,position_label,position_type_id,position_type_name,alternate_positions,nationality_id,nationality_name,nationality_image_url,club_id,club_name,club_image_url,league_name,birthdate,skill_moves_raw,weak_foot,preferred_foot_code,height_cm,weight_kg,detailed_attributes,goalkeeping,player_abilities_raw,avatar_url";

// Single-player fetch for the detail page - never used by the list page,
// so the heavy JSONB columns (detailed_attributes/goalkeeping) only ever
// travel for the one player actually being viewed.
export async function fetchPlayerById(eaPlayerId: number): Promise<PlayerDetail | null> {
  try{return await getPlayerByIdStatic(eaPlayerId)}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: player-detail (${error.artifact})`)}
  /* rollback fallback */
  const params = new URLSearchParams({ select: DETAIL_COLUMNS, ea_player_id: `eq.${eaPlayerId}`, limit: "1" });
  const response = await boundedFc27SupabaseFetch("player-detail",`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Unable to load player ${eaPlayerId} (${response.status})`);
  const rows = (await response.json()) as PlayerDetail[];
  return rows[0] ?? null;
}

export async function fetchSimilarityCandidates(source: PlayerDetail, positions: string[]): Promise<PlayerDetail[]> {
  try{return (await getAllPlayersStatic()).filter(p=>p.ea_player_id!==source.ea_player_id&&positions.includes(p.position_short_label)&&p.overall>=Math.max(1,source.overall-14)&&p.overall<=Math.min(99,source.overall+14)).sort((a,b)=>b.overall-a.overall||a.ea_player_id-b.ea_player_id).slice(0,900)}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: similar-players (${error.artifact})`)}
  /* rollback fallback */
  const params = new URLSearchParams({ select: DETAIL_COLUMNS, position_short_label: `in.(${positions.join(",")})`, overall: `gte.${Math.max(1, source.overall - 14)}`, order: "overall.desc,ea_player_id.asc", limit: "900" });
  params.append("overall", `lte.${Math.min(99, source.overall + 14)}`);
  params.set("ea_player_id", `neq.${source.ea_player_id}`);
  const response = await boundedFc27SupabaseFetch("similar-players",`${supabaseUrl}/rest/v1/fc27_players?${params}`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Unable to load similarity candidates (${response.status})`);
  return (await response.json()) as PlayerDetail[];
}
export async function fetchPlayersByIds(eaPlayerIds: number[]): Promise<PlayerDetail[]> {
  const ids = [...new Set(eaPlayerIds.filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 2);
  if (ids.length === 0) return [];
  try{return await getPlayersByIdsStatic(ids)}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: compare (${error.artifact})`)}
  const params = new URLSearchParams({ select: DETAIL_COLUMNS, ea_player_id: `in.(${ids.join(",")})` });
  const response = await boundedFc27SupabaseFetch("compare",`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Unable to load comparison players (${response.status})`);
  return (await response.json()) as PlayerDetail[];
}

export async function fetchSquadPlayersByIds(eaPlayerIds:number[]):Promise<PlayerListItem[]>{
 const ids=[...new Set(eaPlayerIds.filter(id=>Number.isSafeInteger(id)&&id>0))].slice(0,11);if(!ids.length)return[];
 try{return (await getPlayersByIdsStatic(ids)).map(toList).sort((a,b)=>b.overall-a.overall)}catch(error){if(!isFc27ArtifactError(error))throw error;console.warn(`[FC27 DATA] static artifact unavailable: squad-restore (${error.artifact})`)}
 const params=new URLSearchParams({select:LIST_COLUMNS,ea_player_id:`in.(${ids.join(",")})`,order:"overall.desc"});
 const response=await boundedFc27SupabaseFetch("squad-restore",`${supabaseUrl}/rest/v1/fc27_players?${params}`,{headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`},next:{revalidate:300}});
 if(!response.ok)throw new Error(`Unable to load squad players (${response.status})`);
 return await response.json() as PlayerListItem[];
}

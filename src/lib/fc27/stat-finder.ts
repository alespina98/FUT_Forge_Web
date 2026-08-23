import "server-only";
import type { RankingPlayer } from "./rankings-shared";
import { DETAIL_GROUPS, FACE_FILTERS, GK_FILTERS, STAT_FINDER_PAGE_SIZE, type StatFinderQuery, type StatFinderResult } from "./stat-finder-shared";

const DEFAULT_SUPABASE_URL="https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY="sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||DEFAULT_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||DEFAULT_SUPABASE_ANON_KEY;
const COLUMNS="ea_player_id,slug,display_name,overall,position_short_label,nationality_name,nationality_image_url,club_name,club_image_url,league_name,avatar_url,pace,shooting,passing,dribbling,defending,physicality";
const SORT_FIELD={overall:"overall",pace:"pace",shooting:"shooting",passing:"passing",dribbling:"dribbling",defending:"defending",physical:"physicality"} as const;

export async function fetchStatFinder(query:StatFinderQuery):Promise<StatFinderResult>{
  const offset=(query.page-1)*STAT_FINDER_PAGE_SIZE;
  const order=query.sort==="name"?"display_name.asc,ea_player_id.asc":`${SORT_FIELD[query.sort]}.desc.nullslast,overall.desc,display_name.asc,ea_player_id.asc`;
  const params=new URLSearchParams({select:COLUMNS,order,limit:String(STAT_FINDER_PAGE_SIZE),offset:String(offset)});
  if(query.q){const safe=query.q.replace(/[*,()]/g," ").trim();if(safe){const fields=["display_name","first_name","last_name","common_name"];const conditions=fields.flatMap(field=>[`${field}.ilike.${safe}*`,`${field}.ilike.* ${safe}*`,`${field}.ilike.*-${safe}*`]);params.set("or",`(${conditions.join(",")})`);}}
  if(query.position)params.set("position_short_label",`eq.${query.position}`);
  if(query.nation)params.set("nationality_name",`eq.${query.nation}`);
  if(query.league)params.set("league_name",`eq.${query.league}`);
  if(query.club)params.set("club_name",`ilike.*${query.club.replace(/[*,()]/g," ").trim()}*`);
  if(query.preferredFoot)params.set("preferred_foot_code",`eq.${query.preferredFoot==="Right"?1:2}`);
  const n=query.numeric;
  if(n.ovrMin)params.append("overall",`gte.${n.ovrMin}`);if(n.ovrMax)params.append("overall",`lte.${n.ovrMax}`);
  if(n.skillMovesMin)params.set("skill_moves_raw",`gte.${n.skillMovesMin}`);if(n.weakFootMin)params.set("weak_foot",`gte.${n.weakFootMin}`);
  if(query.position==="GK"){
    for(const [param,field] of GK_FILTERS){const value=n[param];if(value)params.set(field,`gte.${value}`);}
  }else{
    const hasOutfieldStatFilter=FACE_FILTERS.some(([param])=>!!n[param])||Object.values(DETAIL_GROUPS).some(group=>group.some(([param])=>!!n[param]));
    if(hasOutfieldStatFilter&&!query.position)params.set("position_short_label","neq.GK");
    for(const [param,field] of FACE_FILTERS){const value=n[param];if(value)params.set(field,`gte.${value}`);}
    for(const group of Object.values(DETAIL_GROUPS))for(const [param,field] of group){const value=n[param];if(value)params.set(`detailed_attributes->${field}->>value`,`gte.${value}`);}
  }
  const started=performance.now();
  const response=await fetch(`${supabaseUrl}/rest/v1/fc27_players?${params}`,{headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`,Prefer:"count=exact"},next:{revalidate:60}});
  if(!response.ok)throw new Error(`Unable to search FC27 players (${response.status})`);
  const players=await response.json() as RankingPlayer[];const range=response.headers.get("content-range");const total=range?.includes("/")?Number(range.split("/")[1]):players.length;
  return {players,total,page:query.page,pageCount:Math.max(1,Math.ceil(total/STAT_FINDER_PAGE_SIZE)),elapsedMs:Math.round(performance.now()-started)};
}

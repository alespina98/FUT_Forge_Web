import "server-only";
import type { PlayerDetail } from "./players";
import { fetchSimilarityCandidates } from "./players";

export type SimilarReason = { key: string; source: number; candidate: number };
export type SimilarResult = { player: PlayerDetail; similarity: number; reasons: SimilarReason[] };
type Metric = { key: string; weight: number; get: (p: PlayerDetail) => number | null };

const face = (key: keyof Pick<PlayerDetail, "pace"|"shooting"|"passing"|"dribbling"|"defending"|"physicality">, weight: number): Metric => ({ key, weight, get: p => p[key] });
const detail = (key: string, weight: number): Metric => ({ key, weight, get: p => p.detailed_attributes[key]?.value ?? null });
const gk = (key: string, weight: number): Metric => ({ key, weight, get: p => p.goalkeeping[key]?.value ?? null });

const PROFILES: Record<string, Metric[]> = {
  GK: [gk("gk_diving",1),gk("gk_handling",.9),gk("gk_kicking",.55),gk("gk_reflexes",1.1),gk("gk_speed",.35),gk("gk_positioning",1)],
  CB: [face("defending",1.2),face("physicality",1),detail("defensive_awareness",1.15),detail("standing_tackle",1),detail("interceptions",1),detail("strength",.8),detail("pace",.45)],
  FB: [face("pace",1),face("defending",.9),face("physicality",.7),face("passing",.55),detail("stamina",.8),detail("crossing",.6),detail("standing_tackle",.7)],
  DM: [face("defending",1),face("physicality",.85),face("passing",.8),detail("interceptions",1),detail("short_passing",.75),detail("long_passing",.65),detail("stamina",.6)],
  CM: [face("passing",1),face("dribbling",.8),face("physicality",.45),detail("vision",.8),detail("short_passing",1),detail("long_passing",.75),detail("ball_control",.7),detail("stamina",.55)],
  AM: [face("passing",.9),face("dribbling",1),face("shooting",.65),detail("vision",.9),detail("ball_control",.8),detail("dribbling",.8),detail("finishing",.5)],
  W: [face("pace",1),face("dribbling",1),face("shooting",.65),detail("acceleration",.8),detail("sprint_speed",.8),detail("ball_control",.65),detail("finishing",.55)],
  ST: [face("shooting",1.1),face("pace",.8),face("physicality",.55),detail("finishing",1),detail("positioning",.9),detail("shot_power",.65),detail("strength",.45)],
};
function group(pos:string){ if(pos==="GK")return"GK";if(pos==="CB")return"CB";if(["LB","RB","LWB","RWB"].includes(pos))return"FB";if(pos==="CDM")return"DM";if(pos==="CM")return"CM";if(pos==="CAM")return"AM";if(["LM","RM","LW","RW"].includes(pos))return"W";return"ST"; }
export function compatiblePositions(pos:string):string[]{const g=group(pos);return g==="GK"?["GK"]:g==="CB"?["CB"]:g==="FB"?["LB","RB","LWB","RWB"]:g==="DM"?["CDM","CM"]:g==="CM"?["CM","CDM","CAM"]:g==="AM"?["CAM","CM"]:g==="W"?["LM","RM","LW","RW"]:["ST","CF"];}
export async function findSimilarPlayers(source:PlayerDetail):Promise<SimilarResult[]>{
 const metrics=PROFILES[group(source.position_short_label)], candidates=await fetchSimilarityCandidates(source,compatiblePositions(source.position_short_label));
 return candidates.map(player=>{
  const pairs=metrics.map(m=>({m,a:m.get(source),b:m.get(player)})).filter((x):x is {m:Metric;a:number;b:number}=>x.a!==null&&x.b!==null);
  const total=pairs.reduce((s,x)=>s+x.m.weight,0); const sourceMean=pairs.reduce((s,x)=>s+x.a*x.m.weight,0)/total; const candidateMean=pairs.reduce((s,x)=>s+x.b*x.m.weight,0)/total;
  const shape=pairs.reduce((s,x)=>s+Math.abs((x.a-sourceMean)-(x.b-candidateMean))*x.m.weight,0)/(total*99);
  const level=Math.abs(sourceMean-candidateMean)/99, ovr=Math.abs(source.overall-player.overall)/99;
  const traits=Math.abs(Math.min(source.skill_moves_raw,5)-Math.min(player.skill_moves_raw,5))/4*.012+Math.abs(source.weak_foot-player.weak_foot)/4*.008+(source.preferred_foot_code===player.preferred_foot_code?0:.004);
  const role=player.position_short_label===source.position_short_label?0:.012;
  const similarity=Math.round(Math.max(0,Math.min(100,(1-(shape*.74+level*.22+ovr*.04+traits+role))*100)));
  const reasons=pairs.sort((x,y)=>(Math.abs(x.a-x.b)/(x.m.weight+.2))-(Math.abs(y.a-y.b)/(y.m.weight+.2))).slice(0,3).map(x=>({key:x.m.key,source:x.a,candidate:x.b}));
  return {player,similarity,reasons};
 }).sort((a,b)=>b.similarity-a.similarity||Math.abs(a.player.overall-source.overall)-Math.abs(b.player.overall-source.overall)||a.player.ea_player_id-b.player.ea_player_id).slice(0,20);
}
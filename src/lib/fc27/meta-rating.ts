// @ts-ignore Node's strip-types runner needs the explicit extension for the offline generator.
import { FC26_GRADE_CONFIG } from "./meta-rating-config.ts";
export type MetaRole="ST_CF"|"WIDE"|"CAM"|"CM"|"CDM"|"FULLBACK"|"CB"|"GK";
export type Fc27MetaPlayer={ea_player_id:number;display_name:string;overall:number;position_short_label:string;pace:number|null;shooting:number|null;passing:number|null;dribbling:number|null;defending:number|null;physicality:number|null;skill_moves_raw:number;weak_foot:number;player_abilities_raw?:unknown[]};
type RoleEntry={position:number;type:number};
type PositionConfig={weights:number[];playStyles:Record<string,number>;wfPerStar:number;smPerStar:number;multiplier:number};
export type Fc26ParityExtras={playStyles?:Array<{traitId:number|string;isPlus?:boolean}>;plusRoles?:RoleEntry[];plusPlusRoles?:RoleEntry[];accelerateType?:"LENGTHY"|"EXPLOSIVE"|"CONTROLLED"|string};
const cfg=FC26_GRADE_CONFIG;
export function metaRole(pos:string):MetaRole{if(pos==="GK")return"GK";if(pos==="CB")return"CB";if(["LB","RB","LWB","RWB"].includes(pos))return"FULLBACK";if(pos==="CDM")return"CDM";if(pos==="CM")return"CM";if(pos==="CAM")return"CAM";if(["LW","RW","LM","RM"].includes(pos))return"WIDE";return"ST_CF"}
function playStylesFromRaw(raw:unknown[]|undefined){const out=new Map<string,"base"|"plus">();for(const item of raw??[]){if(typeof item==="number"||typeof item==="string")out.set(String(item),"base");else if(item&&typeof item==="object"){const x=item as Record<string,unknown>,id=x.traitId??x.id??x.eaId;if(id!==undefined)out.set(String(id),x.isIcon||x.isPlus?"plus":"base")}}return out}
export type MetaRatingResult={meta:number;rawMeta:number;role:MetaRole;position:string;faceContribution:number;playStyleBonus:number;traitBonus:number;roleBonus:number;runStyleBonus:number};
export function calculateMetaRating(player:Fc27MetaPlayer,extras:Fc26ParityExtras={}):MetaRatingResult|null{
 const position=player.position_short_label.toUpperCase();const pc=(cfg.POSITION_CONFIGS as unknown as Record<string,PositionConfig>)[position];if(!pc)return null;
 const faces=[player.pace,player.shooting,player.passing,player.dribbling,player.defending,player.physicality];if(faces.some(x=>x===null))return null;
 const faceContribution=pc.weights.reduce((sum,w,i)=>sum+w*(faces[i] as number),0);let raw=faceContribution;
 const styles=playStylesFromRaw(player.player_abilities_raw);for(const style of extras.playStyles??[])styles.set(String(style.traitId),style.isPlus?"plus":"base");
 let playStyleBonus=0;for(const [id,weight] of Object.entries(pc.playStyles)){const state=styles.get(id);if(state)playStyleBonus+=Number(weight)*(state==="plus"?2:1)}raw+=playStyleBonus;
 const traitBonus=Math.max(0,Math.min(2,player.weak_foot-3))*pc.wfPerStar+Math.max(0,Math.min(2,player.skill_moves_raw-3))*pc.smPerStar;raw+=traitBonus;
 const rolePosition=(cfg.ROLE_POSITION_ID as Record<string,number>)[position],big=new Set<number>(((cfg.BIG_ROLES as Record<string,readonly number[]>)[String(rolePosition)]??[]));const byType=new Map<number,boolean>();
 for(const [rows,isPlusPlus] of [[extras.plusRoles??[],false],[extras.plusPlusRoles??[],true]] as const)for(const row of rows)if(row.position===rolePosition)byType.set(row.type,isPlusPlus||byType.get(row.type)===true);
 let roleBonus=0;for(const [type,isPlusPlus] of byType){const group=big.has(type)?cfg.ROLE_BONUS.big:cfg.ROLE_BONUS.small;roleBonus+=isPlusPlus?group.plusPlus:group.plus}roleBonus=Math.min(cfg.ROLE_BONUS.cap,roleBonus);raw+=roleBonus;
 const runStyleBonus=extras.accelerateType?Number((cfg.RUN_STYLE_BONUS as Record<string,number>)[String(extras.accelerateType).toUpperCase()]??0):0;raw+=runStyleBonus;raw*=pc.multiplier;
 const n=cfg.NORMALIZE,t=Math.max(0,Math.min(1,(raw-n.rawMin)/(n.rawMax-n.rawMin)));const grade=n.gradeMin+Math.sqrt(t)*(1+n.smoothness*Math.log(1+t))*(n.gradeMax-n.gradeMin);const meta=Math.round(Math.min(n.gradeMax,grade)*10)/10;
 return{meta,rawMeta:Math.round(raw*100)/100,role:metaRole(position),position,faceContribution:Math.round(faceContribution*100)/100,playStyleBonus:Math.round(playStyleBonus*100)/100,traitBonus:Math.round(traitBonus*100)/100,roleBonus:Math.round(roleBonus*100)/100,runStyleBonus};
}

import type {FormationPosition} from "./formations";
export type ChemistryPlayer={ea_player_id:number;position_short_label:string;alternate_positions:Array<{short_label:string}>;club_id:number|null;nationality_id:number;league_name:string|null;chemistry_contributions?:Partial<Record<"club"|"nation"|"league",number>>};
export type ChemistryEntry={playerId:number;slot:FormationPosition;inPosition:boolean;clubChem:number;nationChem:number;leagueChem:number;chemistry:number};
export const MAX_PLAYER_CHEMISTRY=3,MAX_SQUAD_CHEMISTRY=33;
export function isPositionCompatible(player:ChemistryPlayer,slot:FormationPosition){return player.position_short_label===slot||player.alternate_positions.some(p=>p.short_label===slot)}
export function thresholdPoints(count:number,type:"club"|"nation"|"league"){if(type==="club")return count>=7?3:count>=4?2:count>=2?1:0;if(type==="nation")return count>=8?3:count>=5?2:count>=2?1:0;return count>=8?3:count>=5?2:count>=3?1:0}
export function calculateSquadChemistry(rows:Array<{player:ChemistryPlayer;slot:FormationPosition}>){
 const active=rows.filter(r=>isPositionCompatible(r.player,r.slot));
 const count=(type:"club"|"nation"|"league",value:number|string|null)=>value==null?0:active.reduce((n,r)=>{const current=type==="club"?r.player.club_id:type==="nation"?r.player.nationality_id:r.player.league_name;return n+(current===value?Math.max(1,r.player.chemistry_contributions?.[type]??1):0)},0);
 let total=0;const players:ChemistryEntry[]=rows.map(({player,slot})=>{const inPosition=isPositionCompatible(player,slot);let clubChem=0,nationChem=0,leagueChem=0,chemistry=0;if(inPosition){clubChem=thresholdPoints(count("club",player.club_id),"club");nationChem=thresholdPoints(count("nation",player.nationality_id),"nation");leagueChem=thresholdPoints(count("league",player.league_name),"league");chemistry=Math.min(3,clubChem+nationChem+leagueChem)}total+=chemistry;return{playerId:player.ea_player_id,slot,inPosition,clubChem,nationChem,leagueChem,chemistry}});
 return{total,maximum:MAX_SQUAD_CHEMISTRY,players};
}

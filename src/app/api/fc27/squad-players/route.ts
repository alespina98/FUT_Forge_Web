import {NextResponse,type NextRequest} from "next/server";
import {fetchPlayers,fetchSquadPlayersByIds} from "@/lib/fc27/players";
import {calculateMetaRating} from "@/lib/fc27/meta-rating";
function withMeta<T extends Parameters<typeof calculateMetaRating>[0]>(p:T){return{...p,base_meta:calculateMetaRating(p)?.meta??null}}
export async function GET(request:NextRequest){
 const q=request.nextUrl.searchParams.get("q")?.trim()??"";if(q.length<2)return NextResponse.json({results:[]});
 const position=request.nextUrl.searchParams.get("position")?.toUpperCase()??"";const result=await fetchPlayers({q,sort:"overall_desc",page:1});
 const rows=result.players.map(withMeta).sort((a,b)=>{const ac=a.position_short_label===position||a.alternate_positions.some(p=>p.short_label===position),bc=b.position_short_label===position||b.alternate_positions.some(p=>p.short_label===position);return Number(bc)-Number(ac)||b.overall-a.overall}).slice(0,24);
 return NextResponse.json({results:rows});
}
export async function POST(request:NextRequest){
 let value:unknown;try{value=await request.json()}catch{return NextResponse.json({results:[]},{status:400})}
 const ids=Array.isArray((value as {ids?:unknown})?.ids)?(value as {ids:unknown[]}).ids.filter((x):x is number=>Number.isSafeInteger(x)&&Number(x)>0).slice(0,11):[];
 return NextResponse.json({results:(await fetchSquadPlayersByIds(ids)).map(withMeta)});
}

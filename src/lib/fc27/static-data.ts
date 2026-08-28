import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PlayerDetail, PlayerListItem } from "./players";

type Manifest={datasetVersion:string;playerCount:number;shardCount:number;artifacts:{players:string[];search:string[];rankings:Record<string,string>;entities:Record<string,string>;positions:string;filters:string;sitemaps:string[];meta:string;hiddenGems:string}};
const root=process.env.FC27_STATIC_DATA_ROOT||path.join(process.cwd(),"public","fc27-data");
const jsonCache=new Map<string,Promise<any>>();
export class Fc27ArtifactError extends Error{readonly artifact:string;constructor(artifact:string,cause:unknown){super(`FC27 static artifact unavailable: ${artifact}`,{cause});this.name="Fc27ArtifactError";this.artifact=artifact}}
export function isFc27ArtifactError(error:unknown):error is Fc27ArtifactError{return error instanceof Fc27ArtifactError}
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function assetsFetch(rel:string){
 const {getCloudflareContext}=await import("@opennextjs/cloudflare");
 const assets=(getCloudflareContext().env as unknown as {ASSETS?:{fetch(input:Request):Promise<Response>}}).ASSETS;
 if(!assets)throw new Error("ASSETS binding unavailable");
 // The ASSETS binding intermittently rejects a small fraction of fetches
 // when a request fans out across many files (getAllPlayersStatic() reads
 // ~160 shards) - observed in production hitting a different shard each
 // time, so it isn't one bad file. Retry with backoff to absorb most of
 // it; getAllPlayersStatic() below also tolerates a shard still failing
 // after retries rather than failing the whole endpoint over one file.
 let lastStatus=0;
 for(let attempt=0;attempt<4;attempt++){
  if(attempt>0)await delay(50*2**(attempt-1));
  const response=await assets.fetch(new Request(`https://futforge-assets.invalid/fc27-data/${rel}`));
  if(response.ok)return response.text();
  lastStatus=response.status;
 }
 throw new Error(`Static asset returned ${lastStatus}`);
}
async function assetText(rel:string){
 const file=path.join(/* turbopackIgnore: true */ root,...rel.split("/"));
 try{return await readFile(file,"utf8")}catch(fileError){
  try{return await assetsFetch(rel)}catch{throw fileError}
 }
}
async function json<T>(rel:string):Promise<T>{
 let value=jsonCache.get(rel);
 if(!value){
  value=assetText(rel).then(text=>{try{return JSON.parse(text)}catch(error){throw new Fc27ArtifactError(rel,error)}}).catch(error=>{
   // Never let a transient fetch failure permanently poison this cache
   // entry for the lifetime of the isolate - evict on failure so the next
   // request gets a fresh attempt instead of a forever-rejected promise.
   jsonCache.delete(rel);
   throw error instanceof Fc27ArtifactError?error:new Fc27ArtifactError(rel,error);
  });
  jsonCache.set(rel,value);
 }
 return value as Promise<T>;
}
export const getManifest=()=>json<Manifest>("manifest.json");
const versionPath=async(rel:string)=>`${(await getManifest()).datasetVersion}/${rel}`;
export async function readArtifact<T>(rel:string){return json<T>(await versionPath(rel))}
export async function getPlayerIndex(){return readArtifact<Record<string,number>>("players/index.json")}
export async function getPlayerByIdStatic(id:number):Promise<PlayerDetail|null>{const index=await getPlayerIndex(),shard=index[String(id)];if(shard===undefined)return null;const rows=await readArtifact<PlayerDetail[]>(`players/shard-${String(shard).padStart(3,"0")}.json`);return rows.find(p=>p.ea_player_id===id)??null}
export async function getPlayersByIdsStatic(ids:number[]):Promise<PlayerDetail[]>{const index=await getPlayerIndex(),groups=new Map<number,Set<number>>();for(const id of new Set(ids)){const shard=index[String(id)];if(shard!==undefined){if(!groups.has(shard))groups.set(shard,new Set);groups.get(shard)!.add(id)}}const out:PlayerDetail[]=[];await Promise.all([...groups].map(async([shard,wanted])=>{for(const p of await readArtifact<PlayerDetail[]>(`players/shard-${String(shard).padStart(3,"0")}.json`))if(wanted.has(p.ea_player_id))out.push(p)}));return out}
// Firing all ~160 shard fetches through the ASSETS binding at once (a plain
// Promise.all) reliably failed one of them in production - Workers caps how
// many concurrent subrequests a single invocation can have in flight, well
// below the shard count. Cap concurrency so the fan-out never exceeds it.
async function mapWithConcurrency<T,R>(items:T[],limit:number,fn:(item:T)=>Promise<R>):Promise<R[]>{
 const results=new Array<R>(items.length);
 let next=0;
 async function worker(){for(let index=next++;index<items.length;index=next++)results[index]=await fn(items[index])}
 await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
 return results;
}
let allPromise:Promise<PlayerDetail[]>|undefined;
export async function getAllPlayersStatic(){
 if(!allPromise){
  allPromise=getManifest().then(async manifest=>{
   const shards=await mapWithConcurrency(manifest.artifacts.players,8,async shardPath=>{
    try{return await readArtifact<PlayerDetail[]>(shardPath)}
    catch(error){
     // One shard failing after 4 retries shouldn't 500 the whole endpoint -
     // skip it (a small, self-healing gap in filter options/auto-build pool)
     // rather than block every caller on the single flakiest file.
     console.error(`[fc27] skipping unavailable shard ${shardPath}`,error);
     return [] as PlayerDetail[];
    }
   });
   return shards.flat();
  }).catch(error=>{allPromise=undefined;throw error});
 }
 return allPromise;
}
export function toList(p:PlayerDetail):PlayerListItem{return p}
export function toRanking(p:PlayerDetail){return{ea_player_id:p.ea_player_id,slug:p.slug,display_name:p.display_name,overall:p.overall,position_short_label:p.position_short_label,nationality_name:p.nationality_name,nationality_image_url:p.nationality_image_url,club_name:p.club_name,club_image_url:p.club_image_url,league_name:p.league_name,avatar_url:p.avatar_url,pace:p.pace,shooting:p.shooting,passing:p.passing,dribbling:p.dribbling,defending:p.defending,physicality:p.physicality}}
export function foldStatic(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}

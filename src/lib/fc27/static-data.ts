import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PlayerDetail, PlayerListItem } from "./players";

type Manifest={datasetVersion:string;playerCount:number;shardCount:number;artifacts:{players:string[];search:string[];rankings:Record<string,string>;entities:Record<string,string>;positions:string;filters:string;sitemaps:string[];meta:string;hiddenGems:string}};
const root=process.env.FC27_STATIC_DATA_ROOT||path.join(process.cwd(),"public","fc27-data");
const jsonCache=new Map<string,Promise<any>>();
export class Fc27ArtifactError extends Error{constructor(public readonly artifact:string,cause:unknown){super(`FC27 static artifact unavailable: ${artifact}`,{cause});this.name="Fc27ArtifactError"}}
export function isFc27ArtifactError(error:unknown):error is Fc27ArtifactError{return error instanceof Fc27ArtifactError}
async function json<T>(file:string):Promise<T>{let value=jsonCache.get(file);if(!value){value=readFile(file,"utf8").then(text=>{try{return JSON.parse(text)}catch(error){throw new Fc27ArtifactError(file,error)}}).catch(error=>{throw error instanceof Fc27ArtifactError?error:new Fc27ArtifactError(file,error)});jsonCache.set(file,value)}return value as Promise<T>}
export const getManifest=()=>json<Manifest>(path.join(root,"manifest.json"));
const versionPath=async(rel:string)=>path.join(/* turbopackIgnore: true */ root,(await getManifest()).datasetVersion,...rel.split("/"));
export async function readArtifact<T>(rel:string){return json<T>(await versionPath(rel))}
export async function getPlayerIndex(){return readArtifact<Record<string,number>>("players/index.json")}
export async function getPlayerByIdStatic(id:number):Promise<PlayerDetail|null>{const index=await getPlayerIndex(),shard=index[String(id)];if(shard===undefined)return null;const rows=await readArtifact<PlayerDetail[]>(`players/shard-${String(shard).padStart(3,"0")}.json`);return rows.find(p=>p.ea_player_id===id)??null}
export async function getPlayersByIdsStatic(ids:number[]):Promise<PlayerDetail[]>{const index=await getPlayerIndex(),groups=new Map<number,Set<number>>();for(const id of new Set(ids)){const shard=index[String(id)];if(shard!==undefined){if(!groups.has(shard))groups.set(shard,new Set);groups.get(shard)!.add(id)}}const out:PlayerDetail[]=[];await Promise.all([...groups].map(async([shard,wanted])=>{for(const p of await readArtifact<PlayerDetail[]>(`players/shard-${String(shard).padStart(3,"0")}.json`))if(wanted.has(p.ea_player_id))out.push(p)}));return out}
let allPromise:Promise<PlayerDetail[]>|undefined;
export async function getAllPlayersStatic(){if(!allPromise)allPromise=getManifest().then(m=>Promise.all(m.artifacts.players.map(p=>readArtifact<PlayerDetail[]>(p))).then(x=>x.flat()));return allPromise}
export function toList(p:PlayerDetail):PlayerListItem{return p}
export function toRanking(p:PlayerDetail){return{ea_player_id:p.ea_player_id,slug:p.slug,display_name:p.display_name,overall:p.overall,position_short_label:p.position_short_label,nationality_name:p.nationality_name,nationality_image_url:p.nationality_image_url,club_name:p.club_name,club_image_url:p.club_image_url,league_name:p.league_name,avatar_url:p.avatar_url,pace:p.pace,shooting:p.shooting,passing:p.passing,dribbling:p.dribbling,defending:p.defending,physicality:p.physicality}}
export function foldStatic(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Fc27SimilarPlayersView } from "@/components/fc27/similar-players-view";
import { siteCopy } from "@/lib/copy";
import { fetchPlayerById } from "@/lib/fc27/players";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import { findSimilarPlayers } from "@/lib/fc27/similar-players";
type Props={params:Promise<{idSlug:string}>};
async function resolve(raw:string){const id=Number(raw.split("-")[0]);if(!Number.isSafeInteger(id)||id<=0)return null;return fetchPlayerById(id);}
export async function generateMetadata({params}:Props):Promise<Metadata>{const raw=(await params).idSlug,p=await resolve(raw);if(!p)return {robots:{index:false,follow:true}};const path=`/fc27/similar/${playerUrlSlug(p.ea_player_id,p.slug)}`,title=`Players Similar to ${p.display_name} | FC 27 | FUT Forge`,description=`Discover the closest FC 27 player profiles to ${p.display_name}, ranked by position-aware attribute similarity.`;return {title:{absolute:title},description,alternates:{canonical:path},robots:{index:false,follow:true},openGraph:{title,description,url:path,type:"website"}};}
export default async function Page({params}:Props){const raw=(await params).idSlug,p=await resolve(raw);if(!p)notFound();const canonical=playerUrlSlug(p.ea_player_id,p.slug);if(raw!==canonical)redirect(`/fc27/similar/${canonical}`);const results=await findSimilarPlayers(p),path=`/fc27/similar/${canonical}`,url=`${siteCopy.url}${path}`;const jsonLd={"@context":"https://schema.org","@graph":[{"@type":"WebPage",name:`Players Similar to ${p.display_name}`,url,description:`Position-aware FC 27 similarity results for ${p.display_name}.`},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:siteCopy.url},{"@type":"ListItem",position:2,name:"FC 27 Players",item:`${siteCopy.url}/fc27/players`},{"@type":"ListItem",position:3,name:`Similar to ${p.display_name}`,item:url}]}]};return <><JsonLd data={jsonLd}/><Fc27SimilarPlayersView source={p} results={results}/></>;}
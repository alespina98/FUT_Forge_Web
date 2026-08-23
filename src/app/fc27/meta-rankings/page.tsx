import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Fc27MetaRankingsView } from "@/components/fc27/meta-rankings-view";
import { copy, siteCopy } from "@/lib/copy";
import { fetchMetaRankings, META_POSITION_FILTERS, type MetaPositionFilter } from "@/lib/fc27/meta-rankings";
import { rankingPageJsonLd } from "@/lib/fc27/structured-data";

const title = "EA FC 27 Base Meta Ratings & Meta Player Rankings | FUT Forge";
const description = "Explore FUT Forge Base Meta Ratings for EA FC 27 players, calculated with the current FC27 player data and the FUT Forge Meta Rating engine.";
export const metadata: Metadata = { title:{absolute:title},description,alternates:{canonical:"/fc27/meta-rankings"},robots:{index:true,follow:true},openGraph:{type:"website",url:"/fc27/meta-rankings",title,description,siteName:siteCopy.applicationName,locale:"en_US",alternateLocale:["it_IT"]},twitter:{card:"summary",title,description} };

function validPosition(value: string | string[] | undefined): MetaPositionFilter | undefined { const raw=Array.isArray(value)?value[0]:value; return META_POSITION_FILTERS.includes(raw as MetaPositionFilter)?raw as MetaPositionFilter:undefined; }
export default async function MetaRankingsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const position=validPosition((await searchParams).position);const players=await fetchMetaRankings(position);const c=copy.en.fc27MetaRankingsPage;
  const jsonLd=rankingPageJsonLd({path:"/fc27/meta-rankings",name:title,description,breadcrumbName:c.label,players});
  return <><JsonLd data={jsonLd}/><div className="overflow-hidden"><Fc27MetaRankingsView players={players} position={position}/></div></>;
}

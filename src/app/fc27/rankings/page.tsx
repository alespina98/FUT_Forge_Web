import type { Metadata } from "next";
import { Fc27RankingsView } from "@/components/fc27/rankings-view";
import { fetchFilterOptions } from "@/lib/fc27/players";
import { fetchRankings, type RankingQuery } from "@/lib/fc27/rankings";
import { isRankingStat } from "@/lib/fc27/rankings-shared";
import { copy, siteCopy } from "@/lib/copy";
import { JsonLd } from "@/components/json-ld";
import { rankingPageJsonLd } from "@/lib/fc27/structured-data";

export const metadata: Metadata = {
  title: { absolute: copy.en.fc27RankingsPage.metaTitle }, description: copy.en.fc27RankingsPage.metaDescription,
  alternates: { canonical: "/fc27/rankings" }, robots: { index: true, follow: true },
  openGraph: { type:"website",url:"/fc27/rankings",title:copy.en.fc27RankingsPage.metaTitle,description:copy.en.fc27RankingsPage.metaDescription,siteName:siteCopy.applicationName,locale:"en_US",alternateLocale:["it_IT"] },
  twitter: { card:"summary",title:copy.en.fc27RankingsPage.metaTitle,description:copy.en.fc27RankingsPage.metaDescription },
};
type Params=Record<string,string|string[]|undefined>;
function value(v:string|string[]|undefined){const x=Array.isArray(v)?v[0]:v;return x?.trim()||undefined;}
export default async function Fc27RankingsPage({searchParams}:{searchParams:Promise<Params>}){
  const sp=await searchParams;const raw=value(sp.stat);const stat=isRankingStat(raw)?raw:"overall";
  const query:RankingQuery={stat,position:value(sp.position),nation:value(sp.nation),club:value(sp.club),league:value(sp.league)};
  const [players,options]=await Promise.all([fetchRankings(query),fetchFilterOptions()]);
  const jsonLd=rankingPageJsonLd({path:"/fc27/rankings",name:copy.en.fc27RankingsPage.metaTitle,description:copy.en.fc27RankingsPage.metaDescription,breadcrumbName:"Rankings",players});
  return <><JsonLd data={jsonLd}/><Fc27RankingsView players={players} stat={stat} options={options}/></>;
}

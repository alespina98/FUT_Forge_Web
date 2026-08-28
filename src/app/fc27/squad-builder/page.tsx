import type { Metadata } from "next";
import "./squad-builder-responsive.css";
import {JsonLd} from "@/components/json-ld";
import {Fc27SquadBuilderView} from "@/components/fc27/squad-builder-view";
import {Fc27SquadBuilderContent, squadBuilderFaqs} from "@/components/fc27/squad-builder-content";
import {siteCopy} from "@/lib/copy";

const title="EA FC 27 Squad Builder & Auto Builder | FUT Forge";
const description="Build your EA FC 27 squad in minutes: pick a formation, search over 20,000 players, calculate chemistry automatically, or let Auto Builder generate your starting XI for you. Free, no account needed.";
export const metadata: Metadata = {
  title:{absolute:title},description,
  alternates: { canonical: "/fc27/squad-builder" },
  robots: { index: true, follow: true },
  openGraph: { type:"website",url:"/fc27/squad-builder",title,description,siteName:siteCopy.applicationName,locale:"en_US",alternateLocale:["it_IT"] },twitter:{card:"summary",title,description},
};

export default function Fc27SquadBuilderPage() {
  const url=`${siteCopy.url}/fc27/squad-builder`;
  const jsonLd={"@context":"https://schema.org","@graph":[
    {"@type":"WebApplication","@id":`${url}#app`,name:title,description,url,applicationCategory:"SportsApplication",applicationSubCategory:"Squad Builder",operatingSystem:"Web browser",browserRequirements:"Requires JavaScript",inLanguage:["en","it"],isAccessibleForFree:true,offers:{"@type":"Offer",price:"0",priceCurrency:"EUR"},featureList:["Squad building across 13 formations","Automatic chemistry calculation","Auto Builder squad generation","Search across 20,000+ EA FC 27 players","Shareable squad links"]},
    {"@type":"BreadcrumbList","@id":`${url}#breadcrumb`,itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:siteCopy.url},{"@type":"ListItem",position:2,name:"EA FC 27 Players",item:`${siteCopy.url}/fc27/players`},{"@type":"ListItem",position:3,name:"Squad Builder",item:url}]},
    {"@type":"FAQPage","@id":`${url}#faq`,mainEntity:squadBuilderFaqs.map(item=>({"@type":"Question",name:item.q,acceptedAnswer:{"@type":"Answer",text:item.a}}))},
  ]};
  return <><JsonLd data={jsonLd}/><Fc27SquadBuilderView/><Fc27SquadBuilderContent/></>;
}

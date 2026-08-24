import type { Metadata } from "next";
import "./squad-builder-responsive.css";
import {JsonLd} from "@/components/json-ld";
import {Fc27SquadBuilderView} from "@/components/fc27/squad-builder-view";
import {siteCopy} from "@/lib/copy";

const title="EA FC 27 Squad Builder – Build Your Ultimate Team | FUT Forge";
const description="Build your EA FC 27 squad with FUT Forge. Choose a formation, search the FC27 player database, calculate chemistry and create your starting XI.";
export const metadata: Metadata = {
  title:{absolute:title},description,
  alternates: { canonical: "/fc27/squad-builder" },
  robots: { index: true, follow: true },
  openGraph: { type:"website",url:"/fc27/squad-builder",title,description,siteName:siteCopy.applicationName,locale:"en_US",alternateLocale:["it_IT"] },twitter:{card:"summary",title,description},
};

export default function Fc27SquadBuilderPage() {
  const url=`${siteCopy.url}/fc27/squad-builder`;const jsonLd={"@context":"https://schema.org","@graph":[{"@type":"WebApplication","@id":`${url}#app`,name:title,description,url,applicationCategory:"SportsApplication",operatingSystem:"Web browser",browserRequirements:"Requires JavaScript"},{"@type":"BreadcrumbList","@id":`${url}#breadcrumb`,itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:siteCopy.url},{"@type":"ListItem",position:2,name:"EA FC 27 Players",item:`${siteCopy.url}/fc27/players`},{"@type":"ListItem",position:3,name:"Squad Builder",item:url}]}]};
  return <><JsonLd data={jsonLd}/><Fc27SquadBuilderView/></>;
}

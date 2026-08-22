import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fc27BestPositionView } from "@/components/fc27/best-position-view";
import { FC27_POSITIONS, isFc27Position, positionSlug, type Fc27Position } from "@/lib/fc27/best-positions";
import { fetchRankings } from "@/lib/fc27/rankings";
import { copy, siteCopy } from "@/lib/copy";

type Props = { params: Promise<{ position: string }> };
export function generateStaticParams(){return FC27_POSITIONS.map(position=>({position:positionSlug(position)}));}

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const raw=(await params).position; if(!isFc27Position(raw)) return {};
  const position=raw.toUpperCase() as Fc27Position; const name=copy.en.fc27BestPage.positions[position]; const path=`/fc27/best/${raw.toLowerCase()}`;
  const title=copy.en.fc27BestPage.metaTitle.replace("{position}",name).replace("{code}",position);
  const description=copy.en.fc27BestPage.metaDescription.replace("{position}",name.toLowerCase());
  return {title:{absolute:title},description,alternates:{canonical:path},robots:{index:true,follow:true},openGraph:{type:"website",url:path,title,description,siteName:siteCopy.applicationName,locale:"en_US",alternateLocale:["it_IT"]},twitter:{card:"summary",title,description}};
}

export default async function Fc27BestPositionPage({params}:Props){
  const raw=(await params).position; if(!isFc27Position(raw)) notFound(); const position=raw.toUpperCase() as Fc27Position;
  const players=await fetchRankings({stat:"overall",position});
  return <Fc27BestPositionView players={players} position={position}/>;
}

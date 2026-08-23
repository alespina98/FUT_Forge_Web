import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Fc27PositionsView } from "@/components/fc27/positions-view";
import { siteCopy } from "@/lib/copy";
import { FC27_POSITIONS, positionSlug } from "@/lib/fc27/best-positions";
import { fetchPositionCounts } from "@/lib/fc27/positions";
import { positionHubJsonLd } from "@/lib/fc27/structured-data";

const path = "/fc27/positions";
const title = "EA FC 27 Players by Position – Best Players for Every Role | FUT Forge";
const description = "Browse EA FC 27 players by position, including goalkeepers, defenders, midfielders, wingers and strikers, with ratings and official player stats.";

export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: path }, robots: { index: true, follow: true }, openGraph: { type: "website", url: path, title, description, siteName: siteCopy.applicationName }, twitter: { card: "summary", title, description } };

export default async function PositionsPage() {
  const positions = await fetchPositionCounts();
  const jsonLd = positionHubJsonLd({ path, name: title, description, positions: FC27_POSITIONS.map((position) => ({ name: position, path: `/fc27/best/${positionSlug(position)}` })) });
  return <><JsonLd data={jsonLd}/><Fc27PositionsView positions={positions}/></>;
}

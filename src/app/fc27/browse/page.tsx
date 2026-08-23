import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Fc27BrowseView } from "@/components/fc27/browse-view";
import { siteCopy } from "@/lib/copy";
import { pageJsonLd } from "@/lib/fc27/structured-data";

const title = "Explore EA FC 27 Players by Nation, Club & League | FUT Forge";
const description = "Explore the EA FC 27 database by nation, club, league, position, rankings, advanced stats and hidden gems.";
const path = "/fc27/browse";

export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: path }, robots: { index: true, follow: true }, openGraph: { type: "website", url: path, title, description, siteName: siteCopy.applicationName }, twitter: { card: "summary", title, description } };

export default function Fc27BrowsePage() {
  const jsonLd = pageJsonLd({ path, name: title, description, type: "CollectionPage", breadcrumbs: [{ name: "EA FC 27", path: "/fc27/players" }, { name: "Browse", path }] });
  return <><JsonLd data={jsonLd}/><Fc27BrowseView/></>;
}

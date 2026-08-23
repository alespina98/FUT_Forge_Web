import type { Metadata } from "next";
import { Fc27CompareView } from "@/components/fc27/player-compare-view";
import { fetchPlayersByIds } from "@/lib/fc27/players";
import { copy, siteCopy } from "@/lib/copy";
import { JsonLd } from "@/components/json-ld";
import { pageJsonLd } from "@/lib/fc27/structured-data";
import { calculateMetaRating } from "@/lib/fc27/meta-rating";

export const metadata: Metadata = {
  title: { absolute: copy.en.fc27ComparePage.metaTitle },
  description: copy.en.fc27ComparePage.metaDescription,
  alternates: { canonical: "/fc27/compare" },
  robots: { index: true, follow: true },
  openGraph: { type: "website", url: "/fc27/compare", title: copy.en.fc27ComparePage.metaTitle, description: copy.en.fc27ComparePage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.fc27ComparePage.metaTitle, description: copy.en.fc27ComparePage.metaDescription },
};

function parseId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default async function Fc27ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const aId = parseId(params.a);
  const bId = parseId(params.b);
  const players = await fetchPlayersByIds([aId, bId].filter((id): id is number => id !== null));
  const jsonLd = pageJsonLd({ path: "/fc27/compare", name: copy.en.fc27ComparePage.metaTitle, description: copy.en.fc27ComparePage.metaDescription, breadcrumbs: [{ name: "EA FC 27", path: "/fc27/players" }, { name: "Players", path: "/fc27/players" }, { name: "Compare Players", path: "/fc27/compare" }] });
  const playerA=players.find((p) => p.ea_player_id === aId) ?? null;const playerB=players.find((p) => p.ea_player_id === bId) ?? null;
  return <><JsonLd data={jsonLd} /><div className="overflow-hidden"><Fc27CompareView aId={aId} bId={bId} playerA={playerA} playerB={playerB} baseMetaA={playerA?calculateMetaRating(playerA)?.meta??null:null} baseMetaB={playerB?calculateMetaRating(playerB)?.meta??null:null} /></div></>;
}

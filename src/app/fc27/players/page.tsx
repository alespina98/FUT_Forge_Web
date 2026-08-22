import type { Metadata } from "next";
import { Fc27PlayersView } from "@/components/fc27/players-view";
import { fetchPlayers, fetchFilterOptions, isSortKey, type PlayersQuery } from "@/lib/fc27/players";
import { copy, siteCopy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.fc27PlayersPage.metaTitle,
  description: copy.en.fc27PlayersPage.metaDescription,
  alternates: { canonical: "/fc27/players" },
  openGraph: { type: "website", url: "/fc27/players", title: copy.en.fc27PlayersPage.metaTitle, description: copy.en.fc27PlayersPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.fc27PlayersPage.metaTitle, description: copy.en.fc27PlayersPage.metaDescription },
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function str(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() ? v.trim() : undefined;
}
function int(value: string | string[] | undefined): number | undefined {
  const v = str(value);
  if (!v) return undefined;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseQuery(sp: RawSearchParams): PlayersQuery {
  const sortRaw = str(sp.sort);
  return {
    q: str(sp.q),
    position: str(sp.position),
    nation: str(sp.nation),
    league: str(sp.league),
    club: str(sp.club),
    skillMoves: int(sp.sk),
    weakFoot: int(sp.wf),
    overallMin: int(sp.omin),
    overallMax: int(sp.omax),
    paceMin: int(sp.pacemin),
    shootingMin: int(sp.shootingmin),
    passingMin: int(sp.passingmin),
    dribblingMin: int(sp.dribblingmin),
    defendingMin: int(sp.defendingmin),
    physicalityMin: int(sp.physicalitymin),
    sort: isSortKey(sortRaw) ? sortRaw : undefined,
    page: int(sp.page),
  };
}

// Rebuilds the current query string (excluding "page", which pagination
// links append themselves) so Fc27PlayersView can build page 2/3/... links
// without needing its own useSearchParams() read.
function buildBaseQuery(sp: RawSearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "page") continue;
    const v = str(value);
    if (v) params.set(key, v);
  }
  return params.toString();
}

export default async function Fc27PlayersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const query = parseQuery(sp);
  const baseQuery = buildBaseQuery(sp);

  // No try/catch here on purpose: a fetch failure throws and is caught by
  // this route's error.tsx boundary (App Router convention, same pattern
  // as src/app/app/leaks/error.tsx), which gives a real retry button
  // (reset() re-runs this server component) rather than a dead-end message.
  const [{ players, total, page, pageCount }, filterOptions] = await Promise.all([fetchPlayers(query), fetchFilterOptions()]);

  return <Fc27PlayersView players={players} total={total} page={page} pageCount={pageCount} baseQuery={baseQuery} filterOptions={filterOptions} />;
}

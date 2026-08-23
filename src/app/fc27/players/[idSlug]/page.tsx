import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchPlayerById } from "@/lib/fc27/players";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import { Fc27PlayerDetailView } from "@/components/fc27/player-detail-view";
import { siteCopy } from "@/lib/copy";
import type { PlayerDetail } from "@/lib/fc27/players";
import { playerHrefWithReturn, safeFc27ReturnTo } from "@/lib/fc27/return-navigation";
import { JsonLd } from "@/components/json-ld";
import { playerDetailJsonLd } from "@/lib/fc27/structured-data";
import { entityHref } from "@/lib/fc27/entities";

type Props = { params: Promise<{ idSlug: string }>; searchParams: Promise<{ returnTo?: string | string[] }> };

// ea_player_id is authoritative, slug is cosmetic - only the leading
// digits of the URL segment are ever trusted as identity.
function parseIdSlug(idSlug: string): number | null {
  const match = idSlug.match(/^(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function playerMetaDescription(player: PlayerDetail): string {
  const statLabels = player.position_short_label === "GK"
    ? ["DIV", "HAN", "KIC", "REF", "SPD", "POS"]
    : ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
  const statValues = [
    player.pace,
    player.shooting,
    player.passing,
    player.dribbling,
    player.defending,
    player.physicality,
  ];
  const details = [
    player.position_short_label,
    player.club_name,
    player.nationality_name,
    ...statValues.flatMap((value, index) => value == null ? [] : [`${value} ${statLabels[index]}`]),
  ].filter((value): value is string => Boolean(value));
  const statsLabel = player.position_short_label === "GK" ? "full goalkeeping stats" : "full detailed stats";
  const ratingArticle = String(player.overall).startsWith("8") ? "an" : "a";

  return `${player.display_name} has ${ratingArticle} ${player.overall} rating in EA FC 27. View ${details.join(", ")} and ${statsLabel}.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { idSlug } = await params;
  const id = parseIdSlug(idSlug);
  if (!id) return {};
  const player = await fetchPlayerById(id).catch(() => null);
  if (!player) return {};

  const title = `${player.display_name} EA FC 27 Rating ${player.overall}, Stats & Card | FUT Forge`;
  const description = playerMetaDescription(player);
  const canonicalPath = `/fc27/players/${playerUrlSlug(player.ea_player_id, player.slug)}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { type: "website", url: canonicalPath, title, description, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
    twitter: { card: "summary", title, description },
  };
}

export default async function Fc27PlayerDetailPage({ params, searchParams }: Props) {
  const { idSlug } = await params;
  const rawReturnTo = (await searchParams).returnTo;
  const returnTo = safeFc27ReturnTo(Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo);
  const id = parseIdSlug(idSlug);
  if (!id) notFound();

  // No try/catch: a fetch failure throws and is caught by this route's
  // error.tsx boundary, same convention as /fc27/players and /app/leaks.
  const player = await fetchPlayerById(id);
  if (!player) notFound();

  const canonicalIdSlug = playerUrlSlug(player.ea_player_id, player.slug);
  if (idSlug !== canonicalIdSlug) redirect(playerHrefWithReturn(`/fc27/players/${canonicalIdSlug}`, returnTo));

  const title = `${player.display_name} EA FC 27 Rating ${player.overall}, Stats & Card | FUT Forge`;
  const jsonLd = playerDetailJsonLd(player, title, playerMetaDescription(player));
  const [nation, club, league] = await Promise.all([entityHref("nations", player.nationality_name), entityHref("clubs", player.club_name), entityHref("leagues", player.league_name)]);
  return <><JsonLd data={jsonLd} /><Fc27PlayerDetailView player={player} returnTo={returnTo} entityLinks={{ nation, club, league }} /></>;
}

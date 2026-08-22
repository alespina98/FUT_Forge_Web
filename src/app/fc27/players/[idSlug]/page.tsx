import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchPlayerById } from "@/lib/fc27/players";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import { Fc27PlayerDetailView } from "@/components/fc27/player-detail-view";
import { siteCopy } from "@/lib/copy";

type Props = { params: Promise<{ idSlug: string }> };

// ea_player_id is authoritative, slug is cosmetic - only the leading
// digits of the URL segment are ever trusted as identity.
function parseIdSlug(idSlug: string): number | null {
  const match = idSlug.match(/^(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { idSlug } = await params;
  const id = parseIdSlug(idSlug);
  if (!id) return {};
  const player = await fetchPlayerById(id).catch(() => null);
  if (!player) return {};

  const title = `${player.display_name} FC 27 Rating & Stats | FUT Forge`;
  const description = `View ${player.display_name}'s EA SPORTS FC 27 rating, attributes, positions and detailed stats on FUT Forge.`;
  const canonicalPath = `/fc27/players/${playerUrlSlug(player.ea_player_id, player.slug)}`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { type: "website", url: canonicalPath, title, description, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
    twitter: { card: "summary", title, description },
  };
}

export default async function Fc27PlayerDetailPage({ params }: Props) {
  const { idSlug } = await params;
  const id = parseIdSlug(idSlug);
  if (!id) notFound();

  // No try/catch: a fetch failure throws and is caught by this route's
  // error.tsx boundary, same convention as /fc27/players and /app/leaks.
  const player = await fetchPlayerById(id);
  if (!player) notFound();

  const canonicalIdSlug = playerUrlSlug(player.ea_player_id, player.slug);
  if (idSlug !== canonicalIdSlug) redirect(`/fc27/players/${canonicalIdSlug}`);

  return <Fc27PlayerDetailView player={player} />;
}

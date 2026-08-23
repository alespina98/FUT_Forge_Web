import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { EntityDirectoryView } from "@/components/fc27/entity-directory-view";
import { EntityDetailView } from "@/components/fc27/entity-detail-view";
import { siteCopy } from "@/lib/copy";
import { aggregatePageJsonLd, pageJsonLd } from "./structured-data";
import { fetchEntityDirectory, fetchEntityPlayers, resolveEntity, type EntityKind } from "./entities";

const labels: Record<EntityKind, { singular: string; directory: string; directoryTitle: string; directoryDescription: string }> = {
  nations: { singular: "Nation", directory: "Nations", directoryTitle: "EA FC 27 Players by Nation | FUT Forge", directoryDescription: "Browse EA FC 27 players by nation, with player counts and links to the top-rated players from each country." },
  clubs: { singular: "Club", directory: "Clubs", directoryTitle: "EA FC 27 Players by Club | FUT Forge", directoryDescription: "Browse EA FC 27 players by club, ordered by squad size with links to ratings, stats and player profiles." },
  leagues: { singular: "League", directory: "Leagues", directoryTitle: "EA FC 27 Players by League | FUT Forge", directoryDescription: "Browse EA FC 27 players by league, with player counts and links to top-rated player collections." },
};

function detailCopy(kind: EntityKind, name: string) {
  if (kind === "nations") return { title: `Best EA FC 27 ${name} Players – Ratings & Stats | FUT Forge`, description: `Explore the best EA FC 27 players from ${name}, ranked by overall rating with positions, pace, shooting, passing, dribbling, defending, physical stats and player details.` };
  if (kind === "clubs") return { title: `Best EA FC 27 ${name} Players – Ratings & Stats | FUT Forge`, description: `Explore EA FC 27 players from ${name}, ranked by overall rating with positions, player stats, detailed profiles and comparison tools.` };
  return { title: `Best EA FC 27 ${name} Players – Ratings & Stats | FUT Forge`, description: `Explore the best EA FC 27 players in ${name}, ranked by overall rating with positions, clubs, player stats and comparison tools.` };
}

export function directoryMetadata(kind: EntityKind): Metadata {
  const c = labels[kind]; const path = `/fc27/${kind}`;
  return { title: { absolute: c.directoryTitle }, description: c.directoryDescription, alternates: { canonical: path }, robots: { index: true, follow: true }, openGraph: { type: "website", url: path, title: c.directoryTitle, description: c.directoryDescription, siteName: siteCopy.applicationName }, twitter: { card: "summary", title: c.directoryTitle, description: c.directoryDescription } };
}

export async function renderDirectoryPage(kind: EntityKind) {
  const c = labels[kind]; const path = `/fc27/${kind}`; const entities = await fetchEntityDirectory(kind);
  const jsonLd = pageJsonLd({ path, name: c.directoryTitle, description: c.directoryDescription, type: "CollectionPage", breadcrumbs: [{ name: "EA FC 27", path: "/fc27/players" }, { name: c.directory, path }] });
  return <><JsonLd data={jsonLd}/><EntityDirectoryView kind={kind} entities={entities}/></>;
}

export async function detailMetadata(kind: EntityKind, slug: string): Promise<Metadata> {
  const entity = await resolveEntity(kind, slug); if (!entity) return {};
  const c = detailCopy(kind, entity.name); const path = `/fc27/${kind}/${entity.slug}`;
  return { title: { absolute: c.title }, description: c.description, alternates: { canonical: path }, robots: { index: true, follow: true }, openGraph: { type: "website", url: path, title: c.title, description: c.description, siteName: siteCopy.applicationName }, twitter: { card: "summary", title: c.title, description: c.description } };
}

export async function renderDetailPage(kind: EntityKind, slug: string) {
  const entity = await resolveEntity(kind, slug); if (!entity) notFound();
  const { players, total } = await fetchEntityPlayers(kind, entity); const c = detailCopy(kind, entity.name); const path = `/fc27/${kind}/${entity.slug}`; const l = labels[kind];
  const jsonLd = aggregatePageJsonLd({ path, name: c.title, description: c.description, breadcrumbs: [{ name: "EA FC 27", path: "/fc27/players" }, { name: l.directory, path: `/fc27/${kind}` }, { name: entity.name, path }], players });
  return <><JsonLd data={jsonLd}/><EntityDetailView name={entity.name} total={total} players={players}/></>;
}

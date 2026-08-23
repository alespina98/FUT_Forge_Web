import type { PlayerDetail } from "@/lib/fc27/players";
import type { RankingPlayer } from "@/lib/fc27/rankings-shared";
import { playerUrlSlug } from "@/lib/fc27/player-slug";

const ORIGIN = "https://futforgeofficial.com";

type Breadcrumb = { name: string; path: string };

function absoluteUrl(path: string) {
  return new URL(path, ORIGIN).toString();
}

function breadcrumbSchema(url: string, items: Breadcrumb[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const homeBreadcrumb: Breadcrumb = { name: "Home", path: "/" };
const fc27Breadcrumb: Breadcrumb = { name: "EA FC 27", path: "/fc27/players" };
const playersBreadcrumb: Breadcrumb = { name: "Players", path: "/fc27/players" };

export function pageJsonLd({
  path,
  name,
  description,
  type = "WebPage",
  breadcrumbs,
}: {
  path: string;
  name: string;
  description: string;
  type?: "WebPage" | "CollectionPage";
  breadcrumbs: Breadcrumb[];
}) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        inLanguage: "en",
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      breadcrumbSchema(url, [homeBreadcrumb, ...breadcrumbs]),
    ],
  };
}

export function rankingPageJsonLd({
  path,
  name,
  description,
  breadcrumbName,
  players,
}: {
  path: string;
  name: string;
  description: string;
  breadcrumbName: string;
  players: RankingPlayer[];
}) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        inLanguage: "en",
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#itemlist` },
      },
      breadcrumbSchema(url, [homeBreadcrumb, fc27Breadcrumb, playersBreadcrumb, { name: breadcrumbName, path }]),
      {
        "@type": "ItemList",
        "@id": `${url}#itemlist`,
        name,
        numberOfItems: players.length,
        itemListElement: players.map((player, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Person",
            name: player.display_name,
            url: absoluteUrl(`/fc27/players/${playerUrlSlug(player.ea_player_id, player.slug)}`),
          },
        })),
      },
    ],
  };
}

function propertyValue(name: string, value: string | number) {
  return { "@type": "PropertyValue", name, value };
}

function playerProperties(player: PlayerDetail) {
  const goalkeeper = player.position_short_label === "GK";
  const labels = goalkeeper
    ? ["Diving", "Handling", "Kicking", "Reflexes", "Speed", "Positioning"]
    : ["Pace", "Shooting", "Passing", "Dribbling", "Defending", "Physical"];
  const values = [player.pace, player.shooting, player.passing, player.dribbling, player.defending, player.physicality];
  const properties = [
    propertyValue("EA FC 27 Overall", player.overall),
    propertyValue("Position", player.position_short_label),
    ...values.flatMap((value, index) => value == null ? [] : [propertyValue(labels[index], value)]),
    propertyValue("Skill Moves", Math.min(player.skill_moves_raw, 5)),
    propertyValue("Weak Foot", Math.min(player.weak_foot, 5)),
  ];
  const foot = player.preferred_foot_code === 1 ? "Right" : player.preferred_foot_code === 2 ? "Left" : null;
  if (foot) properties.push(propertyValue("Preferred Foot", foot));
  return properties;
}

export function playerDetailJsonLd(player: PlayerDetail, name: string, description: string) {
  const path = `/fc27/players/${playerUrlSlug(player.ea_player_id, player.slug)}`;
  const url = absoluteUrl(path);
  const person: Record<string, unknown> = {
    "@type": "Person",
    "@id": `${url}#player`,
    name: player.display_name,
    url,
    additionalProperty: playerProperties(player),
  };
  if (player.nationality_name) person.nationality = { "@type": "Country", name: player.nationality_name };
  if (player.avatar_url) person.image = player.avatar_url;
  if (/^\d{4}-\d{2}-\d{2}$/.test(player.birthdate)) person.birthDate = player.birthdate;
  if (player.club_name) person.memberOf = { "@type": "SportsTeam", name: player.club_name };
  if (player.height_cm != null) person.height = { "@type": "QuantitativeValue", value: player.height_cm, unitCode: "CMT", unitText: "cm" };
  if (player.weight_kg != null) person.weight = { "@type": "QuantitativeValue", value: player.weight_kg, unitCode: "KGM", unitText: "kg" };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        inLanguage: "en",
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#player` },
      },
      breadcrumbSchema(url, [homeBreadcrumb, fc27Breadcrumb, playersBreadcrumb, { name: player.display_name, path }]),
      person,
    ],
  };
}

import { siteCopy } from "@/lib/copy";
import { fetchPlayerSitemapCount, PLAYER_SITEMAP_CHUNK_SIZE } from "@/lib/fc27/player-sitemaps";
import { renderSitemapIndex, XML_HEADERS } from "@/lib/sitemap-xml";

export const revalidate = 86_400;

export async function GET(): Promise<Response> {
  const playerCount = await fetchPlayerSitemapCount();
  const chunkCount = Math.ceil(playerCount / PLAYER_SITEMAP_CHUNK_SIZE);
  const sitemapUrls = [
    `${siteCopy.url}/sitemap.xml`,
    `${siteCopy.url}/sitemaps/fc27-nations.xml`,
    `${siteCopy.url}/sitemaps/fc27-clubs.xml`,
    `${siteCopy.url}/sitemaps/fc27-leagues.xml`,
    ...Array.from(
      { length: chunkCount },
      (_, index) => `${siteCopy.url}/sitemaps/fc27-players-${index + 1}.xml`,
    ),
  ];

  return new Response(renderSitemapIndex(sitemapUrls), { headers: XML_HEADERS });
}

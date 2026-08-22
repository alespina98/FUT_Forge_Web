import { siteCopy } from "@/lib/copy";
import {
  fetchPlayerSitemapChunk,
  fetchPlayerSitemapCount,
  PLAYER_SITEMAP_CHUNK_SIZE,
} from "@/lib/fc27/player-sitemaps";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import { renderUrlSet, XML_HEADERS } from "@/lib/sitemap-xml";

export const revalidate = 86_400;

const PLAYER_SITEMAP_PATTERN = /^fc27-players-([1-9]\d*)\.xml$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sitemap: string }> },
): Promise<Response> {
  const { sitemap } = await params;
  const match = PLAYER_SITEMAP_PATTERN.exec(sitemap);
  if (!match) return new Response("Not found", { status: 404 });

  const chunkNumber = Number(match[1]);
  const playerCount = await fetchPlayerSitemapCount();
  const chunkCount = Math.ceil(playerCount / PLAYER_SITEMAP_CHUNK_SIZE);
  if (!Number.isSafeInteger(chunkNumber) || chunkNumber > chunkCount) {
    return new Response("Not found", { status: 404 });
  }

  const players = await fetchPlayerSitemapChunk(chunkNumber - 1);
  const urls = players.map(
    (player) => `${siteCopy.url}/fc27/players/${playerUrlSlug(player.ea_player_id, player.slug)}`,
  );
  return new Response(renderUrlSet(urls), { headers: XML_HEADERS });
}

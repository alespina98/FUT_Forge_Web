import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Same verified CDN host futforge_shared/card_art.py's _valid_cdn_url()
// checks server-side. Kept in sync deliberately - this route must never
// become an open proxy for arbitrary URLs.
const ALLOWED_HOST = "game-assets.fut.gg";

/**
 * Server-side relay for FUT.GG's rarity/card-background images.
 *
 * Verified live in production: game-assets.fut.gg applies Referer-based
 * hotlink protection to its rarities-level-*-large/* asset family - a
 * plain server-side fetch (no browser Referer header) succeeds reliably,
 * but the exact same URL loaded directly as a browser <img src> returns
 * 403/503, because the browser sends Referer: https://futforge.vercel.app/
 * on the cross-origin request. Other FUT.GG asset paths already used
 * elsewhere (player-item, player-item-card) are not affected - only this
 * one path family needs relaying.
 */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return NextResponse.json({ ok: false, error: { code: "missing_url", message: "url query parameter is required." } }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ ok: false, error: { code: "invalid_url", message: "url must be a valid URL." } }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ ok: false, error: { code: "invalid_url", message: "url must be an https URL on the verified CDN host." } }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), { cache: "no-store" });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "upstream_unreachable", message: "Could not reach the image source." } }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ ok: false, error: { code: "upstream_error", message: "The image source returned an error." } }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=2678400, immutable",
    },
  });
}

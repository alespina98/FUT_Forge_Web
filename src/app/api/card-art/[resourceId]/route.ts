import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

// Non-personalized (card art by resource_id, same for every viewer), but
// not yet whitelisted as shared-cacheable - default to no-store rather
// than leaving it to Workers Cache's heuristic freshness. A good future
// candidate for an explicit public Cache-Control if this route's own
// volume ever needs it.
const NO_STORE = { "cache-control": "private, no-store, max-age=0" } as const;

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  const assetId = new URL(request.url).searchParams.get("asset_id") ?? "";
  const result = await fetchFromBackend(`/api/card-art/${encodeURIComponent(resourceId)}?asset_id=${encodeURIComponent(assetId)}`);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: NO_STORE });
  }
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

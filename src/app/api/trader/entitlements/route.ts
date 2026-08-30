// GET /api/trader/entitlements — resolves the caller's own trader.* flags.
// Deliberately callable without trader.access (that's what it's for: it's
// how a client — including Desktop's futforge_auth.py fix — finds out
// whether Trader is enabled at all). Server-authoritative, fail-closed.
import { NextResponse } from "next/server";
import { requireTraderIdentity } from "@/lib/trader/route-guard";
import { resolveTraderAccess } from "@/lib/trader/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireTraderIdentity(request);
  if (!guard.ok) return guard.response;
  const entitlements = await resolveTraderAccess(guard.applicationUserId);
  return NextResponse.json({ ok: true, entitlements }, { headers: { "cache-control": "no-store" } });
}

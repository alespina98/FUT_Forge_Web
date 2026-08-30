// GET /api/trader/metrics — Milestone 1: real zeros. No execution path in
// this repository increments trader_session_metrics, so this route never
// returns mocked or estimated non-zero data - only what the table actually
// holds for the caller.
import { NextResponse } from "next/server";
import { requireTraderAccess } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const metrics = await getTraderRepository().getMetrics(guard.applicationUserId);
  return NextResponse.json({ ok: true, metrics }, { headers: { "cache-control": "no-store" } });
}

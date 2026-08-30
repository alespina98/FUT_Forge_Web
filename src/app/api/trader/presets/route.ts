// GET/POST /api/trader/presets — Auto Bid / Auto Trade preset persistence
// only (audit §4 "Preset, filtri, rarità"). Creating a preset never starts
// anything: it is config storage, gated additionally by the matching
// sub-flag (trader.auto_bid / trader.auto_trade) on top of trader.access,
// so a user entitled to Trader but not to a specific engine still cannot
// save that engine's preset shape.
import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { presetInputSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const presets = await getTraderRepository().listPresets(guard.applicationUserId);
  return NextResponse.json({ ok: true, presets }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const parsed = presetInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  const requiredFlag = parsed.data.kind === "auto_bid" ? "trader.auto_bid" : "trader.auto_trade";
  if (!guard.entitlements[requiredFlag]) {
    return NextResponse.json({ ok: false, error: { code: "forbidden", message: `${requiredFlag} is not enabled for this account.` } }, { status: 403 });
  }
  const created = await getTraderRepository().createPreset(guard.applicationUserId, parsed.data.kind, parsed.data.name, parsed.data.config);
  return NextResponse.json({ ok: true, preset: created }, { status: 201 });
}

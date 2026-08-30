// GET/PUT /api/trader/settings — Trader user settings (speed mode, stop
// conditions, post-purchase action). Full trader.access gate: config for a
// module the caller isn't entitled to is not exposed.
import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { traderUserSettingsSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

const DEFAULTS = traderUserSettingsSchema.parse({});

export async function GET(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const settings = (await getTraderRepository().getUserSettings(guard.applicationUserId)) ?? DEFAULTS;
  return NextResponse.json({ ok: true, settings }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const parsed = traderUserSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  await getTraderRepository().upsertUserSettings(guard.applicationUserId, parsed.data);
  return NextResponse.json({ ok: true, settings: parsed.data });
}

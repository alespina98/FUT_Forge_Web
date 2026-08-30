// GET/PUT /api/trader/break-settings — pause/jitter configuration (audit §4
// "Pause e limiti").
import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { traderBreakSettingsSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

const DEFAULTS = traderBreakSettingsSchema.parse({});

export async function GET(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const settings = (await getTraderRepository().getBreakSettings(guard.applicationUserId)) ?? DEFAULTS;
  return NextResponse.json({ ok: true, settings }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const parsed = traderBreakSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  await getTraderRepository().upsertBreakSettings(guard.applicationUserId, parsed.data);
  return NextResponse.json({ ok: true, settings: parsed.data });
}

// GET/POST /api/trader/sessions — Milestone 1: metadata only. A created
// session is a persisted config snapshot in status DRAFT; nothing here (or
// anywhere else in this repository) transitions a session to a running
// state, calls EA, or places any order. See contract.ts's
// sessionStatusSchema and the DB CHECK constraint for the enforced
// non-executing status set.
import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { sessionInputSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

const REQUIRED_FLAG = { search: "trader.sniping", auto_bid: "trader.auto_bid", auto_trade: "trader.auto_trade" } as const;

export async function GET(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const sessions = await getTraderRepository().listSessions(guard.applicationUserId);
  return NextResponse.json({ ok: true, sessions }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const parsed = sessionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  const requiredFlag = REQUIRED_FLAG[parsed.data.kind];
  if (!guard.entitlements[requiredFlag]) {
    return NextResponse.json({ ok: false, error: { code: "forbidden", message: `${requiredFlag} is not enabled for this account.` } }, { status: 403 });
  }
  const created = await getTraderRepository().createSession(guard.applicationUserId, parsed.data.kind, parsed.data);
  return NextResponse.json({ ok: true, session: created }, { status: 201 });
}

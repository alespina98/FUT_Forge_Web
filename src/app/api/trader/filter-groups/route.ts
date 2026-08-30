import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { filterGroupInputSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const groups = await getTraderRepository().listFilterGroups(guard.applicationUserId);
  return NextResponse.json({ ok: true, groups }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const parsed = filterGroupInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  const group = await getTraderRepository().createFilterGroup(guard.applicationUserId, parsed.data);
  return NextResponse.json({ ok: true, group }, { status: 201 });
}

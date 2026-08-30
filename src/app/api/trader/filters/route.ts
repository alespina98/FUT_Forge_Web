import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { filterInputSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const filters = await getTraderRepository().listFilters(guard.applicationUserId);
  return NextResponse.json({ ok: true, filters }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const parsed = filterInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  try {
    const filter = await getTraderRepository().createFilter(guard.applicationUserId, parsed.data);
    return NextResponse.json({ ok: true, filter }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") return badRequest("groupId does not refer to one of your filter groups.");
    throw error;
  }
}

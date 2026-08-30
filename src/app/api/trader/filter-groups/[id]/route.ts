import { NextResponse } from "next/server";
import { requireTraderAccess, notFound } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;
  // Deleting a group never deletes its filters (ON DELETE SET NULL in the
  // migration) - a filter simply becomes ungrouped, it is never silently lost.
  const deleted = await getTraderRepository().deleteFilterGroup(guard.applicationUserId, id);
  if (!deleted) return notFound();
  return NextResponse.json({ ok: true });
}

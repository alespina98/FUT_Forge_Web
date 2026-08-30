import { NextResponse } from "next/server";
import { requireTraderAccess, notFound } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const deleted = await getTraderRepository().deletePreset(guard.applicationUserId, id);
  if (!deleted) return notFound();
  return NextResponse.json({ ok: true });
}

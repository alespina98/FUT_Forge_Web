// PATCH archives a DRAFT session (the only state transition M1 allows -
// DRAFT -> ARCHIVED, never anything toward a running state). DELETE removes
// the record entirely.
import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest, notFound } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (!body || body.action !== "archive") return badRequest('Only {"action":"archive"} is supported in Milestone 1.');
  const { id } = await params;
  const archived = await getTraderRepository().archiveSession(guard.applicationUserId, id);
  if (!archived) return notFound();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Context) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const deleted = await getTraderRepository().deleteSession(guard.applicationUserId, id);
  if (!deleted) return notFound();
  return NextResponse.json({ ok: true });
}

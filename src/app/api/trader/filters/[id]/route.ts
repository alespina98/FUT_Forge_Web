import { NextResponse } from "next/server";
import { requireTraderAccess, badRequest, notFound } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { filterInputSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const parsed = filterInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  const { id } = await params;
  try {
    const updated = await getTraderRepository().updateFilter(guard.applicationUserId, id, parsed.data);
    if (!updated) return notFound();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "GROUP_NOT_FOUND") return badRequest("groupId does not refer to one of your filter groups.");
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const guard = await requireTraderAccess(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const deleted = await getTraderRepository().deleteFilter(guard.applicationUserId, id);
  if (!deleted) return notFound();
  return NextResponse.json({ ok: true });
}

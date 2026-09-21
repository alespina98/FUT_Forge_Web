import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "private, no-store, max-age=0" } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  const result = await fetchFromBackend(`/api/price/${encodeURIComponent(resourceId)}`);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: NO_STORE });
  }
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

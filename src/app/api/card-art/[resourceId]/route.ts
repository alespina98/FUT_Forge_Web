import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  const assetId = new URL(request.url).searchParams.get("asset_id") ?? "";
  const result = await fetchFromBackend(`/api/card-art/${encodeURIComponent(resourceId)}?asset_id=${encodeURIComponent(assetId)}`);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.body, { status: result.status });
}

import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";

// Always hit the backend live — the backend already applies its own
// short-lived pricing cache, so this route must not add a second,
// build-time-frozen cache on top of it.
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchFromBackend("/api/pricing");
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.body, { status: result.status });
}

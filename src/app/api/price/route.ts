import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";

// Always hit the backend live — the backend already applies its own
// short-lived pricing cache, so this route must not add a second,
// build-time-frozen cache on top of it.
export const dynamic = "force-dynamic";

// Explicit, not just implied by dynamic="force-dynamic": Route Handlers
// don't get an automatic private/no-store default the way page renders do,
// and this route's own comment above already says prices must never be
// cached a second time on top of the backend's short-lived cache.
const NO_STORE = { "cache-control": "private, no-store, max-age=0" } as const;

export async function GET() {
  const result = await fetchFromBackend("/api/pricing");
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: NO_STORE });
  }
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

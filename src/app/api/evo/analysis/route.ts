import { NextResponse } from "next/server";
import { fetchFromBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: { code: "invalid_body", message: "Request body must be a JSON object." } }, { status: 400 });
  }
  const result = await fetchFromBackend("/api/evo/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.body, { status: result.status });
}

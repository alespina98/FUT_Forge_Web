import { NextResponse } from "next/server";
import { getLoginRouting } from "@/lib/auth/user-gateway";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { identifier?: unknown } | null;
  if (typeof body?.identifier !== "string" || body.identifier.trim().length > 254) {
    return NextResponse.json({ recoveryRequired: false });
  }
  try {
    return NextResponse.json(await getLoginRouting(body.identifier));
  } catch {
    return NextResponse.json({ error: "identity_database_unavailable" }, { status: 503 });
  }
}

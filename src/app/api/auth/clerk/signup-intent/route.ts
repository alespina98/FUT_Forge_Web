import { NextResponse } from "next/server";
import { checkUsernameAvailability } from "@/lib/auth/user-gateway";
import { issueSignupIntent } from "@/lib/auth/signup-intent";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; username?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const username = typeof body?.username === "string" ? body.username : "";
  try {
    if (!await checkUsernameAvailability(username)) return NextResponse.json({ error: "username_unavailable" }, { status: 409 });
    return NextResponse.json({ intent: issueSignupIntent(email, username) });
  } catch {
    return NextResponse.json({ error: "signup_check_unavailable" }, { status: 503 });
  }
}

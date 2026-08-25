import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createProfileForClerkUser, normalizeUsername } from "@/lib/auth/user-gateway";
import { verifySignupIntent } from "@/lib/auth/signup-intent";

async function makeIdentityUnusable(clerkUserId: string) {
  const client = await clerkClient();
  try {
    await client.users.deleteUser(clerkUserId);
    return true;
  } catch {
    try {
      await client.users.banUser(clerkUserId);
      await client.users.updateUserMetadata(clerkUserId, { privateMetadata: { signupState: "PROFILE_PROVISIONING_FAILED" } });
      return true;
    } catch {
      return false;
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { clerkUserId?: unknown; intent?: unknown } | null;
  if (typeof body?.clerkUserId !== "string" || typeof body.intent !== "string") return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  let intent;
  try { intent = verifySignupIntent(body.intent); } catch { return NextResponse.json({ error: "invalid_intent" }, { status: 400 }); }
  const client = await clerkClient();
  let user;
  try { user = await client.users.getUser(body.clerkUserId); } catch { return NextResponse.json({ error: "clerk_user_not_found" }, { status: 404 }); }
  const primaryEmail = user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
  if (primaryEmail !== intent.email || normalizeUsername(user.username ?? "") !== intent.username || user.unsafeMetadata.signupMode !== "controlled") {
    return NextResponse.json({ error: "identity_mismatch" }, { status: 403 });
  }
  try {
    await createProfileForClerkUser({ clerkUserId: user.id, email: intent.email, username: intent.username });
    return NextResponse.json({ ok: true });
  } catch {
    const reconciled = await makeIdentityUnusable(user.id);
    return NextResponse.json({ error: reconciled ? "username_race_lost" : "orphan_cleanup_failed" }, { status: reconciled ? 409 : 503 });
  }
}

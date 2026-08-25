import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { completePasswordMigration } from "@/lib/auth/user-gateway";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    if (!user.passwordEnabled) return NextResponse.json({ error: "password_required" }, { status: 409 });
    await completePasswordMigration(userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "migration_state_update_failed" }, { status: 503 });
  }
}

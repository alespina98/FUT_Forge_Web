import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchFromBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  // getUser() (not getSession()) is the check that actually revalidates the
  // token against Supabase's Auth server - getSession() alone would trust
  // whatever is in the cookie without verifying it wasn't tampered with.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "unauthorized", message: "Log in to see your club." } }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return NextResponse.json({ ok: false, error: { code: "unauthorized", message: "Log in to see your club." } }, { status: 401 });
  }

  const result = await fetchFromBackend("/api/club", { headers: { Authorization: `Bearer ${token}` } });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.body, { status: result.status });
}

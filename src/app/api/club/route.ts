import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchFromBackend } from "@/lib/backend";
import { isClerkAuth } from "@/lib/auth/provider";
import { auth } from "@clerk/nextjs/server";
import { getAppUserIdFromClerkId } from "@/lib/auth/user-gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  if(isClerkAuth()){
    let userId:string|null;try{userId=(await auth()).userId}catch{return NextResponse.json({ok:false,error:{code:"auth_unavailable",message:"Authentication is temporarily unavailable."}},{status:503})}if(!userId)return NextResponse.json({ok:false,error:{code:"unauthorized",message:"Log in to see your club."}},{status:401});
    let appUserId:string|null;try{appUserId=await getAppUserIdFromClerkId(userId)}catch{return NextResponse.json({ok:false,error:{code:"private_db_unavailable",message:"Club sync is temporarily unavailable during the authentication migration."}},{status:503})}if(!appUserId)return NextResponse.json({ok:false,error:{code:"profile_not_ready",message:"Account setup is not complete."}},{status:409});
    return NextResponse.json({ok:false,error:{code:"legacy_backend_adapter_required",message:"Club sync is temporarily unavailable during the authentication migration."}},{status:503});
  }
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

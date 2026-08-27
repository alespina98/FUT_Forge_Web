import {NextResponse} from "next/server";
import {revokeDesktopSession} from "@/lib/auth/device-auth-service";
export async function POST(request:Request){const body=await request.json().catch(()=>null)as{refresh_token?:unknown}|null;if(typeof body?.refresh_token==="string")await revokeDesktopSession(body.refresh_token);return NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}})}

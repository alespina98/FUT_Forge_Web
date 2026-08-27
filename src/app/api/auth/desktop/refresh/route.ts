import {NextResponse} from "next/server";
import {refreshDesktopSession} from "@/lib/auth/device-auth-service";
export async function POST(request:Request){const body=await request.json().catch(()=>null)as{refresh_token?:unknown}|null;if(typeof body?.refresh_token!=="string")return NextResponse.json({error:"invalid_request"},{status:400});const result=await refreshDesktopSession(body.refresh_token);return result.kind==="tokens"?NextResponse.json(result.tokens,{headers:{"cache-control":"no-store"}}):NextResponse.json({error:result.kind},{status:401,headers:{"cache-control":"no-store"}})}

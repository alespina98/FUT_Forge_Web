import {NextResponse} from "next/server";
import {browserCors} from "@/lib/auth/browser-cors";
import {refreshBrowserSession} from "@/lib/auth/device-auth-service";
export function OPTIONS(request:Request){const headers=browserCors(request);return headers?new NextResponse(null,{status:204,headers}):NextResponse.json({error:"invalid_origin"},{status:403})}
export async function POST(request:Request){const headers=browserCors(request);if(!headers)return NextResponse.json({error:"invalid_origin"},{status:403});const body=await request.json().catch(()=>null) as{refresh_token?:unknown}|null;if(typeof body?.refresh_token!=="string")return NextResponse.json({error:"invalid_request"},{status:400,headers});const result=await refreshBrowserSession(body.refresh_token);return result.kind==="tokens"&&result.tokens?NextResponse.json(result.tokens,{headers:{...headers,"cache-control":"no-store"}}):NextResponse.json({error:result.kind},{status:401,headers})}

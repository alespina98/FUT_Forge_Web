import {NextResponse} from "next/server";
import {browserCors} from "@/lib/auth/browser-cors";
import {revokeBrowserSession} from "@/lib/auth/device-auth-service";
export function OPTIONS(request:Request){const headers=browserCors(request);return headers?new NextResponse(null,{status:204,headers}):NextResponse.json({error:"invalid_origin"},{status:403})}
export async function POST(request:Request){const headers=browserCors(request);if(!headers)return NextResponse.json({error:"invalid_origin"},{status:403});const body=await request.json().catch(()=>null) as{refresh_token?:unknown}|null;if(typeof body?.refresh_token==="string")await revokeBrowserSession(body.refresh_token);return NextResponse.json({ok:true},{headers:{...headers,"cache-control":"no-store"}})}

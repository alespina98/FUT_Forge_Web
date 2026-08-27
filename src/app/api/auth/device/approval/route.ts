import {auth} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {decideDeviceAuthorization,deviceBridgeEnabled,getDeviceApproval,normalizeUserCode} from "@/lib/auth/device-auth-service";

export async function GET(request:Request){
  if(!deviceBridgeEnabled())return NextResponse.json({error:"not_found"},{status:404});
  const{userId}=await auth();if(!userId)return NextResponse.json({error:"unauthorized"},{status:401});
  let value;try{value=await getDeviceApproval(normalizeUserCode(new URL(request.url).searchParams.get("code")),userId)}catch(error){const code=error instanceof Error?error.message:"";return NextResponse.json({error:code==="OWNER_ONLY"?"owner_only":code==="ACTIVE_MAPPING_REQUIRED"?"password_recovery_required":"rate_limited"},{status:code==="OWNER_ONLY"?403:code==="ACTIVE_MAPPING_REQUIRED"?409:429})}
  if(!value)return NextResponse.json({error:"not_found"},{status:404});
  return NextResponse.json({user_code:value.userCode,client_type:value.clientType,client_version:value.clientVersion,status:value.status,expires_at:value.expiresAt},{headers:{"cache-control":"no-store"}});
}

export async function POST(request:Request){
  if(!deviceBridgeEnabled())return NextResponse.json({error:"not_found"},{status:404});
  const{userId}=await auth();if(!userId)return NextResponse.json({error:"unauthorized"},{status:401});
  const origin=request.headers.get("origin");if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:"invalid_origin"},{status:403});
  const body=await request.json().catch(()=>null) as{user_code?:unknown;action?:unknown}|null;
  if((body?.action!=="APPROVE"&&body?.action!=="DENY")||!normalizeUserCode(body.user_code))return NextResponse.json({error:"invalid_request"},{status:400});
  try{const value=await decideDeviceAuthorization({userCode:normalizeUserCode(body.user_code),clerkUserId:userId,action:body.action});return NextResponse.json({ok:true,status:value.status})}
  catch(error){const code=error instanceof Error?error.message:"";return NextResponse.json({error:code==="OWNER_ONLY"?"owner_only":code==="ACTIVE_MAPPING_REQUIRED"?"password_recovery_required":code==="RATE_LIMITED"?"rate_limited":"not_pending"},{status:code==="OWNER_ONLY"?403:code==="RATE_LIMITED"?429:409})}
}

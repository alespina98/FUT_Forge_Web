import {clerkClient} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {browserBridgeEnabled,enforceDeviceRate,exchangeDesktopClerkUser,requesterFingerprint} from "@/lib/auth/device-auth-service";
import {getLoginRouting} from "@/lib/auth/user-gateway";
const errorStatus:Record<string,number>={unknown_identifier:404,invalid_credentials:401,password_recovery_required:409,rate_limited:429,active_mapping_required:409};
export async function POST(request:Request){
  if(!browserBridgeEnabled())return NextResponse.json({error:"not_found"},{status:404});
  const body=await request.json().catch(()=>null) as{identifier?:unknown;password?:unknown}|null;
  if(typeof body?.identifier!=="string"||typeof body?.password!=="string"||!body.identifier.trim()||!body.password)
    return NextResponse.json({error:"invalid_request"},{status:400});
  try{
    await enforceDeviceRate("desktop_login",await requesterFingerprint(request));
    const routing=await getLoginRouting(body.identifier);
    if(!routing.email)throw new Error("unknown_identifier");
    if(routing.recoveryRequired)throw new Error("password_recovery_required");
    const client=await clerkClient();
    const users=await client.users.getUserList({emailAddress:[routing.email],limit:1});
    const user=users.data[0];
    if(!user)throw new Error("unknown_identifier");
    try{await client.users.verifyPassword({userId:user.id,password:body.password})}
    catch(verifyError){
      const status=(verifyError as{status?:number})?.status;
      if(status===429)throw new Error("rate_limited");
      if(status&&status>=500)throw new Error("service_unavailable");
      throw new Error("invalid_credentials");
    }
    const value=await exchangeDesktopClerkUser(user.id);
    return NextResponse.json({...value.tokens,profile:value.profile},{headers:{"cache-control":"no-store"}});
  }catch(error){
    const code=error instanceof Error&&error.message==="RATE_LIMITED"?"rate_limited":error instanceof Error?error.message:"service_unavailable";
    const status=errorStatus[code]??503;
    return NextResponse.json({error:status===503?"service_unavailable":code},{status,headers:{"cache-control":"no-store"}});
  }
}

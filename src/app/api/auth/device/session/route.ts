import {NextResponse} from "next/server";
import {deviceBridgeEnabled} from "@/lib/auth/device-auth-service";
import {resolveRequestIdentity} from "@/lib/auth/request-identity";
export async function GET(request:Request){if(!deviceBridgeEnabled())return NextResponse.json({error:"not_found"},{status:404});const identity=await resolveRequestIdentity(request,"identity:read");return identity?NextResponse.json({application_user_id:identity.applicationUserId,provider:identity.provider,scope:identity.scope}):NextResponse.json({error:"unauthorized"},{status:401})}

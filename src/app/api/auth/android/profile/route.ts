import {NextResponse} from "next/server";
import {resolveRequestIdentity} from "@/lib/auth/request-identity";
import {getIdentityRepository} from "@/lib/auth/turso-identity-repository";
export async function GET(request:Request){const identity=await resolveRequestIdentity(request,"identity:read");if(!identity||identity.provider!=="FUTFORGE"||identity.clientType!=="android")return NextResponse.json({error:"unauthorized"},{status:401});const profile=await getIdentityRepository().getUserByApplicationId(identity.applicationUserId);return profile?NextResponse.json({id:profile.id,email:profile.email,username:profile.username,role:profile.role,tier:profile.tier},{headers:{"cache-control":"no-store"}}):NextResponse.json({error:"unauthorized"},{status:401})}

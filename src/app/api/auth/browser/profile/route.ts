import {NextResponse} from "next/server";
import {browserCors} from "@/lib/auth/browser-cors";
import {resolveRequestIdentity} from "@/lib/auth/request-identity";
import {getIdentityRepository} from "@/lib/auth/turso-identity-repository";
export function OPTIONS(request:Request){const headers=browserCors(request);return headers?new NextResponse(null,{status:204,headers}):NextResponse.json({error:"invalid_origin"},{status:403})}
export async function GET(request:Request){const headers=browserCors(request);if(!headers)return NextResponse.json({error:"invalid_origin"},{status:403});const identity=await resolveRequestIdentity(request,"identity:read");if(!identity||identity.provider!=="FUTFORGE"||identity.clientType!=="browser")return NextResponse.json({error:"unauthorized"},{status:401,headers});const profile=await getIdentityRepository().getUserByApplicationId(identity.applicationUserId);return profile?NextResponse.json({id:profile.id,email:profile.email,username:profile.username,role:profile.role,tier:profile.tier},{headers:{...headers,"cache-control":"no-store"}}):NextResponse.json({error:"unauthorized"},{status:401,headers})}

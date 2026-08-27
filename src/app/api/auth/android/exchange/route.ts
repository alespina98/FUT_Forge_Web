import {auth} from "@clerk/nextjs/server";
import {NextResponse} from "next/server";
import {browserBridgeEnabled,exchangeAndroidClerkSession} from "@/lib/auth/device-auth-service";
export async function POST(){if(!browserBridgeEnabled())return NextResponse.json({error:"not_found"},{status:404});const{userId}=await auth();if(!userId)return NextResponse.json({error:"unauthorized"},{status:401});try{const value=await exchangeAndroidClerkSession(userId);return NextResponse.json({...value.tokens,profile:value.profile},{headers:{"cache-control":"no-store"}})}catch{return NextResponse.json({error:"active_mapping_required"},{status:409})}}

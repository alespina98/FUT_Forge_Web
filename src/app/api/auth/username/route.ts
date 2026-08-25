import { NextResponse } from "next/server";
import { checkUsernameAvailability } from "@/lib/auth/user-gateway";
export async function POST(request:Request){const body=await request.json().catch(()=>null) as {username?:unknown}|null;const username=typeof body?.username==="string"?body.username:"";try{return NextResponse.json({available:await checkUsernameAvailability(username)})}catch{return NextResponse.json({available:false,error:"unavailable"},{status:503})}}

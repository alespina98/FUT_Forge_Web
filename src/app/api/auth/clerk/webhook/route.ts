import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createProfileForClerkUser } from "@/lib/auth/user-gateway";

export async function POST(request:NextRequest){
  let event:Awaited<ReturnType<typeof verifyWebhook>>;
  try{event=await verifyWebhook(request)}catch{return NextResponse.json({error:"invalid_signature"},{status:400})}
  if(event.type!=="user.created")return NextResponse.json({ok:true});
  if(event.data.unsafe_metadata?.signupMode==="controlled")return NextResponse.json({ok:true,provisioning:"finalize_signup"});
  const email=event.data.email_addresses.find(x=>x.id===event.data.primary_email_address_id)?.email_address||event.data.email_addresses[0]?.email_address;
  const username=event.data.username;
  if(!email||!username)return NextResponse.json({error:"username_and_email_required"},{status:422});
  try{await createProfileForClerkUser({clerkUserId:event.data.id,email,username});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"profile_provisioning_failed"},{status:409})}
}

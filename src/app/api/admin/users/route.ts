import { NextResponse } from "next/server";
import { AdminAccessError,requireClerkAdmin } from "@/lib/auth/admin-gateway";

export async function GET(request:Request){
  try{
    const {actor,repository}=await requireClerkAdmin();
    const query=new URL(request.url).searchParams;
    const role=query.get("role");const tier=query.get("tier");
    if(role&&role!=="USER"&&role!=="ADMIN")return NextResponse.json({error:"Invalid filter"},{status:400});
    if(tier&&tier!=="FREE"&&tier!=="PREMIUM")return NextResponse.json({error:"Invalid filter"},{status:400});
    const rawLimit=Number(query.get("limit")??25);const rawOffset=Number(query.get("offset")??0);if(!Number.isFinite(rawLimit)||!Number.isFinite(rawOffset))return NextResponse.json({error:"Invalid pagination"},{status:400});
    const result=await repository.listAdminUsers({actorApplicationUserId:actor.id,search:query.get("search")??undefined,role:(role||undefined) as "USER"|"ADMIN"|undefined,tier:(tier||undefined) as "FREE"|"PREMIUM"|undefined,limit:rawLimit,offset:rawOffset});
    return NextResponse.json(result);
  }catch(error){const status=error instanceof AdminAccessError?error.status:503;return NextResponse.json({error:status===503?"Admin service unavailable":"Access denied"},{status})}
}
